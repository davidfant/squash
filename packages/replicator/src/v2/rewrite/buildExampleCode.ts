import { clone } from "@/lib/clone";
import * as prettier from "@/lib/prettier";
import { recmaFixProperties } from "@/lib/recma/fixProperties";
import { recmaRemoveRedundantFragment } from "@/lib/recma/removeRedundantFragment";
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
import { createRef } from "../createRef";
import { recmaReplaceRefs } from "../replaceRefs";
import type { ReplicatorState } from "../state";

export async function buildExampleCode({
  component,
  nodeId,
  elements,
  state,
}: {
  component: { id: Metadata.ReactFiber.ComponentId; name: string };
  nodeId: Metadata.ReactFiber.NodeId;
  elements: Element[];
  state: ReplicatorState;
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
      .use(recmaReplaceRefs, state)
      .use(recmaFixProperties)
      .use(recmaStringify),
  };

  const node = state.node.all.get(nodeId)!;
  const nodeProps = clone(node.props) as Record<string, unknown>;

  const sampleTree: Root = {
    type: "root",
    children: elements,
  };

  const depsFromProps = state.node.descendants.fromProps.get(nodeId);
  for (const dep of depsFromProps ?? []) {
    visit(sampleTree, "element", (element, index, parent) => {
      if (index === undefined) return;
      if (parent?.type !== "element" && parent?.type !== "root") return;

      const nodeId = element.properties?.[
        "dataSquashNodeId"
      ] as Metadata.ReactFiber.NodeId;

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
    component,
    props: nodeProps,
    ctx: { deps: new Set(), state },
    children: [],
  });
  const [html, jsx] = await Promise.all([
    processors.html
      .run(sampleTree)
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
