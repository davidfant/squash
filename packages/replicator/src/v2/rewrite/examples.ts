import { clone } from "@/lib/clone";
import * as prettier from "@/lib/prettier";
import { recmaFixProperties } from "@/lib/recma/fixProperties";
import { recmaRemoveRedundantFragment } from "@/lib/recma/removeRedundantFragment";
import { recmaStripSquashAttribute } from "@/lib/recma/stripSquashAttribute";
import { rehypeStripSquashAttribute } from "@/lib/rehype/stripSquashAttribute";
import { rehypeUnwrapRefs } from "@/lib/rehype/unwrapRefs";
import { recmaWrapAsComponent } from "@/lib/rehype/wrapAsComponent";
import type { Metadata } from "@/types";
import type { Element, Root } from "hast";
import { h } from "hastscript";
import recmaJsx from "recma-jsx";
import recmaStringify from "recma-stringify";
import rehypeRecma from "rehype-recma";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { SKIP, visit } from "unist-util-visit";
import { createRef, recmaReplaceRefs } from "../ref";
import type { ReplicatorNodeStatus, ReplicatorState } from "../state";

type NodeId = Metadata.ReactFiber.NodeId;
type ComponentId = Metadata.ReactFiber.ComponentId;

export async function buildExampleCode({
  component,
  nodeId,
  elements,
  state,
  placeholders = true,
}: {
  component: { id: ComponentId; name: string };
  nodeId: NodeId;
  elements: Element[];
  state: ReplicatorState;
  placeholders?: boolean;
}) {
  const processors = {
    html: unified()
      .use(rehypeStripSquashAttribute)
      .use(rehypeUnwrapRefs)
      .use(rehypeStringify),
    jsx: unified()
      .use(rehypeStripSquashAttribute)
      .use(rehypeRecma)
      .use(recmaJsx)
      .use(recmaRemoveRedundantFragment)
      .use(recmaWrapAsComponent, "Sample")
      .use(recmaReplaceRefs, state, component.name)
      .use(recmaStripSquashAttribute)
      .use(recmaFixProperties)
      .use(recmaStringify),
  };

  const node = state.node.all.get(nodeId)!;
  const nodeProps = clone(node.props) as Record<string, unknown>;

  const exampleTree: Root = { type: "root", children: elements };
  if (placeholders) {
    const depsFromProps = state.node.descendants.fromProps.get(nodeId);
    for (const dep of depsFromProps ?? []) {
      let found = false;

      const parents: Array<Element | Root> = [];
      visit(exampleTree, "element", (element, index, parent) => {
        if (index === undefined) return;
        if (parent?.type !== "element" && parent?.type !== "root") return;

        const nodeId = element.properties?.["dataSquashNodeId"] as NodeId;

        if (state.node.ancestors.get(nodeId)?.has(dep.nodeId)) {
          const lastKey = dep.keys[dep.keys.length - 1]!;
          const lastValue = dep.keys
            .slice(0, -1)
            .reduce((acc, k) => acc[k], nodeProps as any);
          if (!found) {
            found = true;
            lastValue[lastKey] = {
              $$typeof: "react.tag",
              tagName: "placeholder",
              props: { prop: dep.keys.join("/") },
            };
            parent.children[index] = h("placeholder", {
              prop: dep.keys.join("/"),
            });
          } else {
            parents.push(parent);
            parent.children[index] = h("rm");
          }
          return SKIP;
        }
      });

      parents.forEach(
        (p) =>
          (p.children = p.children.filter(
            (el) => !(el.type === "element" && el.tagName === "rm")
          ))
      );
    }
  }

  const ref = createRef({ component, props: nodeProps });
  const [html, jsx] = await Promise.all([
    processors.html
      .run(exampleTree)
      .then((t) => processors.html.stringify(t as Root))
      .then(prettier.html)
      .then((s) => s.trim()),
    processors.jsx
      .run({ type: "root", children: [ref] })
      .then((estree) => processors.jsx.stringify(estree))
      .then(prettier.ts)
      .then((s) => s.trim())
      .then(
        (s) =>
          `import { ${component.name} } from "./${component.name}";\n\n${s}`
      ),
  ]);

  return { html, jsx };
}

export function replaceExamples(
  component: { id: ComponentId; name: string },
  state: ReplicatorState,
  skipNodeIds: Set<NodeId>
): Map<NodeId, ReplicatorNodeStatus> {
  const replaced = new Map<NodeId, ReplicatorNodeStatus>();
  // for (const tree of state.node.trees.values()) {
  for (const tree of [...state.trees.values()]) {
    const componentNodeIds = state.component.nodes.get(component.id);
    for (const parentId of componentNodeIds ?? []) {
      if (skipNodeIds.has(parentId)) {
        replaced.set(parentId, "skipped");
        continue;
      }

      const node = state.node.all.get(parentId);
      if (!node) continue;
      // const depsFromProps = state.node.descendants.fromProps.get(parentId);
      // for (const dep of depsFromProps ?? []) {

      // }
      // get the props and recurse through them

      const items: Array<{
        element: Element;
        index: number;
        parent: Element | Root;
      }> = [];

      visit(tree, "element", (element, index, parent) => {
        if (index === undefined) return;
        if (parent?.type !== "element" && parent?.type !== "root") return;

        const nodeId = element.properties?.["dataSquashNodeId"] as NodeId;
        if (state.node.ancestors.get(nodeId)?.has(parentId)) {
          items.push({ element, index, parent });
          return SKIP;
        }
      });

      if (items.length) {
        // TODO: go through props to identify child trees???
        state.trees.set(Math.random().toString(), {
          type: "root",
          children: clone(items.map((i) => i.element)),
        });

        // console.log("replacing", component, parentId, items);

        const first = items[0]!;
        first.parent.children[first.index] = createRef({
          component,
          props: node.props as Record<string, unknown>,
        });

        items
          .slice(1)
          .reverse()
          .forEach((i) => i.parent.children.splice(i.index, 1));
      }

      replaced.set(parentId, "valid");
    }
  }

  return replaced;
}
