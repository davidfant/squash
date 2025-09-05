import { clone } from "@/lib/clone";
import * as prettier from "@/lib/prettier";
import { rehypeUnwrapRefs } from "@/lib/rehype/unwrapRefs";
import type { Metadata } from "@/types";
import type { Root } from "hast";
import { h } from "hastscript";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { SKIP, visit } from "unist-util-visit";
import type { Logger } from "winston";
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
  nodes: Map<NodeId, ReplicatorNodeStatus>;
} | null> {
  const samples = new Map<
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
          const list = samples.get(parentId)?.get(tree) ?? [];
          if (!samples.has(parentId)) samples.set(parentId, new Map());
          samples.get(parentId)?.set(tree, [...list, { element, nodeId }]);
          return SKIP;
        }
      });
    }
  }

  const processors = {
    html: {
      full: unified()
        // .use(rehypeStripSquashAttribute)
        .use(rehypeUnwrapRefs)
        .use(rehypeStringify),
      // limited: unified()
      //   .use(rehypeLimitDepth, metadata, limitDepthConfig)
      //   .use(rehypeStripSquashAttribute)
      //   .use(rehypeUnwrapRefs)
      //   .use(rehypeStringify),
    },
    // jsx: {
    //   full: unified()
    //     .use(rehypeStripSquashAttribute)
    //     .use(rehypeRecma)
    //     .use(recmaJsx)
    //     .use(recmaRemoveRedundantFragment)
    //     .use(recmaWrapAsComponent, "Sample")
    //     .use(recmaReplaceRefs, registry)
    //     .use(recmaFixProperties)
    //     .use(recmaStringify),
    //   limited: unified()
    //     .use(rehypeStripSquashAttribute)
    //     .use(rehypeRecma)
    //     .use(recmaJsx)
    //     .use(recmaRemoveRedundantFragment)
    //     .use(recmaWrapAsComponent, "Sample")
    //     .use(recmaReplaceRefs, registry)
    //     .use(recmaLimitDepth, limitDepthConfig)
    //     .use(recmaFixProperties)
    //     .use(recmaStringify),
    // },
  };

  await Promise.all(
    [...samples].map(async ([nodeId, s]) => {
      if (s.size !== 1) {
        throw new Error("TODO: multiple trees");
      }

      const rootTree = s.keys().next().value!;
      const items = s.values().next().value!;
      const node = state.node.all.get(nodeId)!;
      const nodeProps = clone(node.props) as Record<string, unknown>;

      const depsFromProps = state.node.descendants.fromProps.get(nodeId);
      console.log("depsFromProps", depsFromProps);

      // TODO: BEFORE THIS CLONE SHIT... ALSO, change the samples to be tree specific. do something more similar to how descendants.fromProps works internally. For each detected descendant within props, find it in any tree, and then replace it both in the props and tree with the same placeholder!
      // const deps = new Map<
      //   NodeId,
      //   Array<{ element: Element; nodeId: NodeId }>
      // >();

      const sampleTree: Root = {
        type: "root",
        children: clone(items.map((s) => s.element)),
      };

      for (const dep of depsFromProps ?? []) {
        // for (const { tree } of [...state.node.trees.values()].flat()) {
        visit(sampleTree, "element", (element, index, parent) => {
          if (index === undefined) return;
          if (parent?.type !== "element" && parent?.type !== "root") return;

          const nodeId = element.properties?.["dataSquashNodeId"] as NodeId;

          if (state.node.ancestors.get(nodeId)?.has(dep.nodeId)) {
            // deps.set(dep.nodeId, [
            //   ...(deps.get(dep.nodeId) ?? []),
            //   { element, nodeId },
            // ]);
            parent!.children[index] = h("placeholder", {
              path: dep.keys.join("/"),
            });
            const last = dep.keys
              .slice(0, -1)
              .reduce((acc, k) => acc[k], nodeProps as any);
            const tag: Metadata.ReactFiber.PropValue.Tag = {
              $$typeof: "react.tag",
              tagName: "placeholder",
              props: { path: dep.keys.join("/") },
            };
            last[dep.keys[dep.keys.length - 1]!] = tag;
            return SKIP;
          }
        });
        // }
      }

      // 1. get all nodes from props provided to nodeId
      // 2. visit the items[number].element and if it has a node as an ancestor, replace it with a new placeholder
      // 3. in the props, replace it with the same placeholder

      /*
      
      export function buildDescendantsFromProps(
  nodes: Map<NodeId, Metadata.ReactFiber.Node>
): Map<NodeId, Set<NodeId>> {
  const collect = (val: any, out: Set<NodeId>): void => {
    if (Array.isArray(val)) {
      for (const v of val) collect(v, out);
    } else if (typeof val === "object" && val !== null) {
      if (val.$$typeof === "react.component") {
        const el = val as Metadata.ReactFiber.PropValue.Component;
        if (el.nodeId) out.add(el.nodeId);
      }
      // TODO: write a test to verify that this works
      if (val.$$typeof === "react.fragment") {
        const f = val as Metadata.ReactFiber.PropValue.Fragment;
        for (const c of f.children) collect(c, out);
      }

      for (const v of Object.values(val)) collect(v, out);
    }
  };

  const provided = new Map<NodeId, Set<NodeId>>();
  for (const [nodeId, node] of nodes.entries()) {
    const set = provided.get(nodeId) ?? new Set<NodeId>();
    collect(node.props, set);
    if (set.size > 0) provided.set(nodeId, set);
  }

  return provided;
}
      
      */

      // iterate

      const html = await processors.html.full
        .run(sampleTree)
        .then((t) => processors.html.full.stringify(t as Root))
        .then(prettier.html)
        .then((s) => s.trim());

      // const depHtmls = await Promise.all(
      //   [...deps].map(async ([parentId, ds]) => {
      //     return await processors.html.full
      //       .run({
      //         type: "root",
      //         children: clone(ds.map((s) => s.element)),
      //       } as Root)
      //       .then((t: any) => processors.html.full.stringify(t as Root))
      //       .then(prettier.html)
      //       .then((s) => s.trim());
      //   })
      // );

      console.log("\n\n\n\n--- MAIN ---");
      console.log(html);
      console.log("--- DEPS ---");
      // for (const html of depHtmls) {
      //   console.log(html);
      //   console.log("---");
      // }

      // const ref = createRef({
      //   componentId,
      //   props: state.node.all.get(nodeId)!.props as Record<string, unknown>,
      //   ctx: {
      //     deps: new Set(),
      //     codeIdToComponentId: state.component.fromCodeId,
      //     componentRegistry: registry,
      //   },
      //   children: [],
      // });
    })
  );

  // logger.info("wow", Object.fromEntries(samples.entries()));
  return null;
}
