import { generateText } from "@/lib/ai";
import { clone } from "@/lib/clone";
import { filesystemCacheMiddleware } from "@/lib/filesystemCacheMiddleware";
import { withCacheBreakpoints } from "@/lib/rewriteComponent/llm/withCacheBreakpoint";
import type { Metadata } from "@/types";
import { anthropic, type AnthropicProviderOptions } from "@ai-sdk/anthropic";
import {
  InvalidToolInputError,
  tool,
  wrapLanguageModel,
  type ModelMessage,
} from "ai";
import type { Root } from "hast";
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
    Map<Root, Array<{ element: Element; nodeId: NodeId }>>
  >();
  for (const parentId of state.component.nodes.get(componentId) ?? []) {
    for (const tree of state.node.trees.values()) {
      visit(tree, "element", (element, index, parent) => {
        if (index === undefined) return;
        if (parent?.type !== "element" && parent?.type !== "root") return;

        const nodeId = element.properties?.["dataSquashNodeId"] as NodeId;
        if (state.node.ancestors.get(nodeId)?.has(parentId)) {
          const list = examples.get(parentId)?.get(tree) ?? [];
          if (!examples.has(parentId)) examples.set(parentId, new Map());
          examples.get(parentId)?.set(tree, [...list, { element, nodeId }]);
          return SKIP;
        }
      });
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
    [...examples].map(([nodeId, s]) => {
      if (s.size !== 1) throw new Error("TODO: multiple trees");
      return buildExampleCode({
        component: { id: componentId, name: exampleComponentName },
        nodeId,
        elements: [...s.values()][0]!.map((s) => clone(s.element)),
        state,
      });
    })
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
    const { reasoningText, toolCalls, response } = await generateText({
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
        }),
      },
      providerOptions: {
        anthropic: {
          thinking: { type: "enabled", budgetTokens: 1024 },
        } satisfies AnthropicProviderOptions,
      },
    });
    messages.push(...response.messages);

    const tc = toolCalls[toolCalls.length - 1];
    if (!tc) throw new Error("No tool call found");
    if (tc.invalid && tc.error instanceof InvalidToolInputError) {
      logger.warn("Invalid tool call when rewriting component", {
        componentId,
        attempt,
        toolCalls,
      });
      messages.push({ role: "user", content: tc.error.message });
      continue;
    }

    if (tc.dynamic) throw new Error("Dynamic tool call found");
    if (tc.toolName === "updateComponent") {
      const error = await validate({
        component: {
          id: componentId,
          name: { original: exampleComponentName, new: tc.input.name },
          code: tc.input.code,
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

        messages.push({ role: "user", content: error });
        attempt++;
        continue;
      }

      const registryItem: ComponentRegistryItem = {
        id: componentId,
        dir: path.join("components", componentId),
        name: tc.input.name,
        code: tc.input.code,
      };
      state.component.registry.set(componentId, registryItem);
      state.component.name.set(componentId, tc.input.name);

      const replaced = replaceExamples(
        { id: componentId, name: tc.input.name },
        state
      );
      replaced.forEach((status, nodeId) =>
        state.node.status.set(nodeId, status)
      );
      return {
        name: tc.input.name,
        description: tc.input.description,
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
