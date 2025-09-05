import { generateText } from "@/lib/ai";
import { clone } from "@/lib/clone";
import { filesystemCacheMiddleware } from "@/lib/filesystemCacheMiddleware";
import * as prettier from "@/lib/prettier";
import { recmaFixProperties } from "@/lib/recma/fixProperties";
import { recmaRemoveRedundantFragment } from "@/lib/recma/removeRedundantFragment";
import { rehypeStripSquashAttribute } from "@/lib/rehype/stripSquashAttribute";
import { rehypeUnwrapRefs } from "@/lib/rehype/unwrapRefs";
import { recmaWrapAsComponent } from "@/lib/rehype/wrapAsComponent";
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
import { h } from "hastscript";
import recmaJsx from "recma-jsx";
import recmaStringify from "recma-stringify";
import rehypeRecma from "rehype-recma";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { SKIP, visit } from "unist-util-visit";
import type { Logger } from "winston";
import z from "zod";
import { createRef } from "./createRef";
import * as Prompts from "./prompts";
import { recmaReplaceRefs } from "./replaceRefs";
import type { ReplicatorNodeStatus, ReplicatorState } from "./state";

type Element = import("hast").Element;
type NodeId = Metadata.ReactFiber.NodeId;
type ComponentId = Metadata.ReactFiber.ComponentId;

export async function rewrite(
  componentId: ComponentId,
  state: ReplicatorState,
  logger: Logger
): Promise<{
  code: string;
  name: string;
  description: string;
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
    for (const { tree } of [...state.node.trees.values()].flat()) {
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

  const processors = {
    html: {
      full: unified()
        .use(rehypeStripSquashAttribute)
        .use(rehypeUnwrapRefs)
        .use(rehypeStringify),
      // limited: unified()
      //   .use(rehypeLimitDepth, metadata, limitDepthConfig)
      //   .use(rehypeStripSquashAttribute)
      //   .use(rehypeUnwrapRefs)
      //   .use(rehypeStringify),
    },
    jsx: {
      full: unified()
        .use(rehypeStripSquashAttribute)
        .use(rehypeRecma)
        .use(recmaJsx)
        .use(recmaRemoveRedundantFragment)
        .use(recmaWrapAsComponent, "Sample")
        .use(recmaReplaceRefs, state)
        .use(recmaFixProperties)
        .use(recmaStringify),
      // limited: unified()
      //   .use(rehypeStripSquashAttribute)
      //   .use(rehypeRecma)
      //   .use(recmaJsx)
      //   .use(recmaRemoveRedundantFragment)
      //   .use(recmaWrapAsComponent, "Sample")
      //   .use(recmaReplaceRefs, registry)
      //   .use(recmaLimitDepth, limitDepthConfig)
      //   .use(recmaFixProperties)
      //   .use(recmaStringify),
    },
  };

  const componentName = (() => {
    if (state.component.registry.has(componentId)) {
      return state.component.registry.get(componentId)!.name;
    }
    const component = state.component.all.get(componentId)!;
    const name = (component as Metadata.ReactFiber.Component.WithCode<any>)
      .name;
    if (name && name.length > 3) return name;
  })();

  const examplesCode = await Promise.all(
    [...examples].map(async ([nodeId, s]) => {
      if (s.size !== 1) {
        throw new Error("TODO: multiple trees");
      }

      const rootTree = s.keys().next().value!;
      const items = s.values().next().value!;
      const node = state.node.all.get(nodeId)!;
      const nodeProps = clone(node.props) as Record<string, unknown>;

      const sampleTree: Root = {
        type: "root",
        children: clone(items.map((s) => s.element)),
      };

      const depsFromProps = state.node.descendants.fromProps.get(nodeId);
      for (const dep of depsFromProps ?? []) {
        visit(sampleTree, "element", (element, index, parent) => {
          if (index === undefined) return;
          if (parent?.type !== "element" && parent?.type !== "root") return;

          const nodeId = element.properties?.["dataSquashNodeId"] as NodeId;

          if (state.node.ancestors.get(nodeId)?.has(dep.nodeId)) {
            parent!.children[index] = h("placeholder", {
              prop: dep.keys.join("/"),
            });
            const last = dep.keys
              .slice(0, -1)
              .reduce((acc, k) => acc[k], nodeProps as any);
            const tag: Metadata.ReactFiber.PropValue.Tag = {
              $$typeof: "react.tag",
              tagName: "placeholder",
              props: { prop: dep.keys.join("/") },
            };
            last[dep.keys[dep.keys.length - 1]!] = tag;
            return SKIP;
          }
        });
      }

      const ref = createRef({
        component: { id: componentId, name: componentName ?? "Component" },
        props: nodeProps,
        ctx: { deps: new Set(), state },
        children: [],
      });
      const [html, jsx] = await Promise.all([
        processors.html.full
          .run(sampleTree)
          .then((t) => processors.html.full.stringify(t as Root))
          .then(prettier.html)
          .then((s) => s.trim()),
        processors.jsx.full
          .run({ type: "root", children: [ref] })
          .then((estree) => processors.jsx.full.stringify(estree))
          .then(prettier.ts)
          .then((s) => s.trim()),
      ]);

      return { html, jsx };
    })
  );

  const messages: ModelMessage[] = [
    { role: "system", content: Prompts.instructions },
    {
      role: "user",
      content: Prompts.userMessage(minifiedCode, componentName, examplesCode),
    },
  ];
  const attempt = 0;
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
    providerOptions:
      attempt === 0
        ? {
            anthropic: {
              thinking: { type: "enabled", budgetTokens: 1024 },
            } satisfies AnthropicProviderOptions,
          }
        : undefined,
  });

  messages.push(...response.messages);

  const tc = toolCalls[toolCalls.length - 1];
  if (
    tc &&
    tc.toolName === "updateComponent" &&
    tc.invalid &&
    tc.error instanceof InvalidToolInputError
  ) {
    throw new Error("TC failed..... " + tc.error.message);
    // messages.push({ role: "user", content: tc.error.message });
    // continue;
  }

  if (tc && !tc.dynamic && tc.toolName === "updateComponent") {
    return { ...tc.input, reasoning: reasoningText, nodes: new Map() };
  }

  console.log("WOW", { reasoningText, toolCalls });

  // logger.info("wow", Object.fromEntries(samples.entries()));
  return null;
}
