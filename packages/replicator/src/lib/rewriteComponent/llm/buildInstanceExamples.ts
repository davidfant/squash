import type { ComponentRegistry } from "@/lib/componentRegistry";
import * as prettier from "@/lib/prettier";
import type { Metadata } from "@/types";
import type { Element, Root } from "hast";
import recmaJsx from "recma-jsx";
import recmaStringify from "recma-stringify";
import rehypeRecma from "rehype-recma";
import rehypeStringify from "rehype-stringify";
import type { Plugin } from "unified";
import { unified } from "unified";
import { visitParents } from "unist-util-visit-parents";
import { recmaFixProperties } from "../../recma/fixProperties";
import { recmaRemoveRedundantFragment } from "../../recma/removeRedundantFragment";
import { recmaReplaceRefs } from "../../recma/replaceRefs";
import { rehypeStripSquashAttribute } from "../../rehype/stripSquashAttribute";
import { rehypeUnwrapRefs } from "../../rehype/unwrapRefs";
import { recmaWrapAsComponent } from "../../rehype/wrapAsComponent";
import type { RewriteComponentInstance } from "../types";

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

const limitDepth: Plugin<[metadata: Metadata.ReactFiber], Root> =
  (metadata) => (tree) => {
    function isComponentElement(el: Element) {
      const nodeId = el.properties["dataSquashNodeId"];
      const node = metadata.nodes[nodeId as Metadata.ReactFiber.NodeId];
      const parent = metadata.nodes[node?.parentId!];
      const component = metadata.components[parent?.componentId!];
      return !!component && "codeId" in component;
    }

    visitParents(tree, "element", (node, ancestors) => {
      const componentDepth = ancestors
        .filter((a) => a.type === "element")
        .filter((el, idx) => idx !== 0 && isComponentElement(el)).length;

      const domDepth = ancestors.length;
      // const domDepthSinceLastComponent = (() => {
      //   let n = 0;
      //   for (let i = ancestors.length - 1; i >= 0; i--) {
      //     const el = ancestors[i] as Element;
      //     if (isComponentElement(el)) break;
      //     n++;
      //   }
      //   return n;
      // })();

      const inComponent = componentDepth > 0;

      const exceedsComponentDepth =
        componentDepth >= 1 && isComponentElement(node);
      const exceedsDomDepth =
        inComponent && domDepth >= 10 && !isComponentElement(node);

      if (exceedsComponentDepth || exceedsDomDepth) {
        // prune by wiping children and add placeholder comment
        node.children = [{ type: "comment", value: " children redacted " }];
      }
    });
  };

export function buildInstanceExamples(
  instances: RewriteComponentInstance[],
  registry: ComponentRegistry,
  metadata: Metadata.ReactFiber
) {
  const processors = {
    html: {
      full: unified()
        .use(rehypeStripSquashAttribute)
        .use(rehypeUnwrapRefs)
        .use(rehypeStringify),
      redacted: unified()
        .use(limitDepth, metadata)
        .use(rehypeStripSquashAttribute)
        .use(rehypeUnwrapRefs)
        .use(rehypeStringify),
    },
    jsx: unified()
      .use(rehypeStripSquashAttribute)
      .use(rehypeRecma)
      .use(recmaJsx)
      .use(recmaRemoveRedundantFragment)
      .use(recmaWrapAsComponent, "Sample")
      .use(recmaReplaceRefs, { componentRegistry: registry })
      .use(recmaFixProperties)
      .use(recmaStringify),
  };

  return Promise.all(
    instances.map(async (i) => {
      const [jsx, htmlFull, htmlRedacted] = await Promise.all([
        processors.jsx
          .run({ type: "root", children: [i.ref] })
          .then((estree) => processors.jsx.stringify(estree))
          .then(prettier.ts),
        processors.html.full
          .run({ type: "root", children: clone(i.children) } as Root)
          .then((t: any) => processors.html.full.stringify(t as Root))
          .then(prettier.html)
          .then((s) => s.trim()),
        processors.html.redacted
          .run({ type: "root", children: clone(i.children) } as Root)
          .then((t: any) => processors.html.redacted.stringify(t as Root))
          .then(prettier.html)
          .then((s) => s.trim()),
      ]);
      return { jsx, html: { full: htmlFull, redacted: htmlRedacted } };
    })
  );
}
