import { generateText } from "@/lib/ai";
import { clone } from "@/lib/clone";
import { filesystemCacheMiddleware } from "@/lib/filesystemCacheMiddleware";
import { withCacheBreakpoints } from "@/lib/rewriteComponent/llm/withCacheBreakpoint";
import type { Metadata } from "@/types";
import { anthropic, type AnthropicProviderOptions } from "@ai-sdk/anthropic";
import { stepCountIs, tool, wrapLanguageModel, type ModelMessage } from "ai";
import path from "path";
import { SKIP, visit } from "unist-util-visit";
import type { Logger } from "winston";
import z from "zod";
import type {
  ComponentRegistryItem,
  ReplicatorNodeStatus,
  ReplicatorState,
} from "../state";
import { buildExampleCode, replaceExamples } from "./examples";
import * as Prompts from "./prompts";
import { validate } from "./validate";

type Element = import("hast").Element;
type NodeId = Metadata.ReactFiber.NodeId;
type ComponentId = Metadata.ReactFiber.ComponentId;

export async function rewrite(
  componentId: ComponentId,
  state: ReplicatorState,
  logger: Logger
): Promise<{
  name: string;
  description: string;
  item: ComponentRegistryItem;
  reasoning: string | undefined;
  nodes: Map<NodeId, ReplicatorNodeStatus>;
} | null> {
  const component = state.component.all.get(
    componentId
  )! as Metadata.ReactFiber.Component.WithCode<any>;
  const minifiedCode = state.code.get(component.codeId);
  if (!minifiedCode) throw new Error("Minified code not found");

  const examples = new Map<
    NodeId,
    Array<{ element: Element; nodeId: NodeId }>
  >();
  for (const parentId of state.component.nodes.get(componentId) ?? []) {
    for (const tree of state.trees.values()) {
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
        examples.set(parentId, items);
        break;
      }
    }
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

  const examplesCode = await Promise.all(
    [...examples].map(([nodeId, items]) =>
      buildExampleCode({
        component: { id: componentId, name: exampleComponentName },
        nodeId,
        elements: items.map((s) => clone(s.element)),
        state,
      })
    )
  );

  const content = Prompts.initialUserMessage(
    minifiedCode,
    componentName,
    examplesCode,
    { maxNumExamples: 5 }
  );
  const messages: ModelMessage[] = [
    { role: "system", content: Prompts.instructions },
    { role: "user", content },
  ];

  let attempt = 0;
  while (attempt < 3) {
    logger.debug(`Rewriting component`, { componentId, attempt });
    const { reasoningText, toolResults, response } = await generateText({
      model: wrapLanguageModel({
        model: anthropic("claude-sonnet-4-20250514"),
        // model: google("gemini-2.5-flash"),
        middleware: filesystemCacheMiddleware(),
      }),
      messages: withCacheBreakpoints(messages),
      tools: {
        updateComponent: tool({
          description:
            "Rewrite a minified React component and return the updated TypeScript code.",
          inputSchema: z.object({
            code: z.string(),
            name: z.string(),
            description: z.string(),
          }),
          execute: async (input) => {
            const error = await validate({
              component: {
                id: componentId,
                name: { original: exampleComponentName, new: input.name },
                code: input.code,
              },
              state,
              examples: examplesCode,
            });
            if (error) {
              logger.debug("Validation error after rewriting component", {
                componentId,
                attempt,
                error,
              });
              return { ok: false, error };
            }

            return { ok: true };
          },
        }),
      },
      providerOptions: {
        anthropic: {
          thinking: { type: "enabled", budgetTokens: 1024 },
        } satisfies AnthropicProviderOptions,
      },
      stopWhen: [
        // ❸ — exit *only* after a non-error result for updateComponent
        ({ steps }) =>
          steps
            .flatMap((s) => s.toolResults)
            .some(
              (s) =>
                !s.dynamic && s.toolName === "updateComponent" && s.output.ok
            ),
        ({ steps }) =>
          steps
            .flatMap((s) => s.toolResults)
            .filter(
              (s) =>
                !s.dynamic && s.toolName === "updateComponent" && !s.output.ok
            ).length >= 2,
        stepCountIs(5),
      ],
    });
    messages.push(...response.messages);

    const tr = toolResults[toolResults.length - 1];
    if (!tr) throw new Error("No tool call found");

    if (!tr.dynamic && tr.toolName === "updateComponent") {
      const registryItem: ComponentRegistryItem = {
        id: componentId,
        dir: path.join("components", componentId),
        name: tr.input.name,
        code: tr.input.code,
      };
      state.component.registry.set(componentId, registryItem);
      state.component.name.set(componentId, tr.input.name);

      const replaced = replaceExamples(
        { id: componentId, name: tr.input.name },
        state
      );
      replaced.forEach((status, nodeId) =>
        state.node.status.set(nodeId, status)
      );
      return {
        name: tr.input.name,
        description: tr.input.description,
        item: registryItem,
        reasoning: reasoningText,
        nodes: replaced,
      };
    }
  }

  logger.warn("Failed to rewrite component after all attempts", {
    componentId,
    attempt,
  });
  return null;
}
