import { generateText } from "@/lib/ai";
import { clone } from "@/lib/clone";
import { filesystemCacheMiddleware } from "@/lib/filesystemCacheMiddleware";
import { withCacheBreakpoints } from "@/lib/rewriteComponent/llm/withCacheBreakpoint";
import type { Metadata } from "@/types";
import { anthropic, type AnthropicProviderOptions } from "@ai-sdk/anthropic";
import { stepCountIs, wrapLanguageModel } from "ai";
import { traceable } from "langsmith/traceable";
import path from "path";
import { SKIP, visit } from "unist-util-visit";
import type { Logger } from "winston";
import type {
  ComponentRegistryItem,
  ReplicatorNodeStatus,
  ReplicatorState,
} from "../state";
import { generateDeclarationFile } from "./dts";
import { buildExampleCode, replaceExamples } from "./examples";
import * as Prompts from "./prompts";
import { createReplicatorTools } from "./tools";
import { validate } from "./validate";

type Element = import("hast").Element;
type NodeId = Metadata.ReactFiber.NodeId;
type ComponentId = Metadata.ReactFiber.ComponentId;

export async function rewrite(
  componentId: ComponentId,
  state: ReplicatorState,
  logger: Logger
): Promise<{
  item: ComponentRegistryItem;
  reasoning: string | undefined;
  nodes: Map<NodeId, ReplicatorNodeStatus>;
} | null> {
  const component = state.component.all.get(
    componentId
  )! as Metadata.ReactFiber.Component.WithCode<any>;
  const minifiedCode = state.code.get(component.codeId);
  if (!minifiedCode) throw new Error("Minified code not found");

  const exampleNodes = new Map<
    NodeId,
    Array<{ element: Element; nodeId: NodeId }>
  >();
  for (const parentId of state.component.nodes.get(componentId) ?? []) {
    const tree = state.trees.root;
    // for (const tree of state.trees.values()) {
    const items: Array<{ element: Element; nodeId: NodeId }> = [];
    visit(tree, "element", (element, index, parent) => {
      if (index === undefined) return;
      if (parent?.type !== "element" && parent?.type !== "root") return;

      const nodeId = element.properties?.["dataSquashNodeId"] as NodeId;
      if (state.node.ancestors.get(nodeId)?.has(parentId)) {
        items.push({ element, nodeId });
        return SKIP;
      }
    });
    // TODO: is it a dangerous assumption that we'll just find the first tree that has this element? it assumes that trees are listed by depth (aka the biggest tree first). e.g. if a descendant of parentId exists in a tree, it might also exist a deeper nested descendant in a later tree.
    if (items.length) {
      exampleNodes.set(parentId, items);
      // break;
    }
    // }
  }

  const componentName = (() => {
    if (state.component.registry.has(componentId)) {
      return state.component.registry.get(componentId)!.name;
    }
    const component = state.component.all.get(componentId)!;
    const name = (component as Metadata.ReactFiber.Component.WithCode<any>)
      .name;
    if (name && name.length > 3) return name;
  })();
  const exampleComponentName = componentName ?? "Component";

  const examples = await Promise.all(
    [...exampleNodes].map(async ([nodeId, items]) => {
      const ex = await buildExampleCode({
        component: { id: componentId, name: exampleComponentName },
        nodeId,
        elements: items.map((s) => clone(s.element)),
        state,
      });
      return { nodeId, ...ex };
    })
  );

  const deps = (state.component.nodes.get(componentId) ?? [])
    .flatMap((nodeId) => {
      const descendants = new Set(state.node.descendants.all.get(nodeId));
      state.node.descendants.fromProps.get(nodeId)?.forEach((d) => {
        descendants.delete(d.nodeId);
        state.node.descendants.all
          .get(d.nodeId)
          ?.forEach((d) => descendants.delete(d));
      });
      descendants.forEach(
        (d) => !state.node.status.has(d) && descendants.delete(d)
      );

      return [...descendants]
        .map((d) => state.node.all.get(d)?.componentId)
        .filter((c) => !!c);
    })
    .filter((v, i, a) => a.indexOf(v) === i)
    .map((c) => state.component.registry.get(c))
    .filter((c) => !!c)
    // .map((c) => {
    //   const item = state.component.registry.get(c);
    //   if (!item) {
    //     throw new Error(
    //       `Component ${componentId} depends on ${c} which is not found in registry`
    //     );
    //   }
    //   return item;
    // })
    .map((c) => ({
      name: c.name,
      description: c.description,
      module: path.join(`@`, c.dir, c.name),
      code: c.code,
    }));

  const content = Prompts.initialUserMessage(
    minifiedCode,
    componentName,
    deps,
    examples,
    { maxNumExamples: 5 }
  );

  logger.debug(`Rewriting component`, { componentId });

  let lastValidationError: string | undefined = undefined;
  const { reasoningText, toolResults, response } = await generateText({
    model: wrapLanguageModel({
      model: anthropic("claude-sonnet-4-20250514"),
      // model: google("gemini-2.5-flash"),
      middleware: filesystemCacheMiddleware(),
    }),
    messages: withCacheBreakpoints([
      { role: "system", content: Prompts.instructions },
      { role: "user", content },
    ]),
    tools: createReplicatorTools(),
    prepareStep: ({ messages }) => {
      if (lastValidationError) {
        const newMessage = {
          role: "user",
          content: lastValidationError,
        } as const;
        lastValidationError = undefined;
        return { messages: [...messages, newMessage] };
      }
      return {};
    },
    providerOptions: {
      anthropic: {
        thinking: { type: "enabled", budgetTokens: 1024 },
      } satisfies AnthropicProviderOptions,
    },
    stopWhen: [
      async ({ steps }) => {
        const toolResults = steps
          .flatMap((s) => s.toolResults)
          .filter((s) => !s.dynamic);
        const latest = toolResults.findLast(
          (r) => r.toolName === "editComponent"
        )?.output;
        if (!latest) return false;

        const skippedExampleIds = toolResults
          .filter((r) => r.toolName === "skipExamples")
          .flatMap((r) => r.input.ids);

        const comp = {
          id: componentId,
          name: { original: exampleComponentName, new: latest.component.name },
          code: latest.code,
        };
        const error = await traceable(
          (c: typeof comp) =>
            validate({
              component: c,
              state,
              examples: examples.filter(
                (e) => !skippedExampleIds.includes(e.nodeId)
              ),
            }),
          { name: "Validate" }
        )(comp);

        if (error) {
          lastValidationError = error;
          logger.debug("Validation error after rewriting component", {
            componentId,
            error: lastValidationError,
          });
        } else {
          logger.debug("Validation success after rewriting component", {
            componentId,
          });
        }

        return !error;
      },
      stepCountIs(3),
    ],
  });

  const latest = toolResults
    .filter((r) => !r.dynamic)
    .findLast((r) => r.toolName === "editComponent")?.output;
  const skippedExampleIds = toolResults
    .filter((r) => !r.dynamic)
    .filter((r) => r.toolName === "skipExamples")
    .flatMap((r) => r.input.ids);

  if (latest) {
    const registryItem: ComponentRegistryItem = {
      id: componentId,
      dir: path.join("components", componentId),
      name: latest.component.name,
      description: latest.component.description,
      code: {
        ts: latest.code,
        dts: await generateDeclarationFile(latest.code, [
          ...state.component.registry.values(),
        ]),
      },
    };
    state.component.registry.set(componentId, registryItem);
    state.component.name.set(componentId, latest.component.name);

    const replaced = replaceExamples(
      { id: componentId, name: latest.component.name },
      state,
      new Set(skippedExampleIds as Metadata.ReactFiber.NodeId[])
    );

    replaced.forEach((status, nodeId) => state.node.status.set(nodeId, status));
    return {
      item: registryItem,
      reasoning: reasoningText,
      nodes: replaced,
    };
  }

  logger.warn("Failed to rewrite component", { componentId });
  return null;
}
