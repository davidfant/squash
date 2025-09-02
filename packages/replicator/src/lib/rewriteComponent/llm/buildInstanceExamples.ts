import type { ComponentRegistry } from "@/lib/componentRegistry";
import * as prettier from "@/lib/prettier";
import type { Metadata } from "@/types";
import type { Node, NodeMap, Program } from "estree";
import { visit as estreeVisit } from "estree-util-visit";
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

interface LimitDepthConfig {
  maxComponents: number;
  maxDom: number;
}

const limitDepthConfig: LimitDepthConfig = {
  maxComponents: 2,
  maxDom: 10,
};

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

const rehypeLimitDepth: Plugin<
  [metadata: Metadata.ReactFiber, config: LimitDepthConfig],
  Root
> = (metadata) => (tree) => {
  function isComponentElement(el: Element) {
    if (el.tagName === "ref") return false;
    const nodeId = el.properties["dataSquashNodeId"];
    const node = metadata.nodes[nodeId as Metadata.ReactFiber.NodeId];
    const parent = metadata.nodes[node?.parentId!];
    const component = metadata.components[parent?.componentId!];
    return !!component && "codeId" in component;
  }

  visitParents(tree, "element", (node, ancestors) => {
    const componentDepth =
      ancestors.filter((a) => a.type === "element").filter(isComponentElement)
        .length - 1;
    const domDepth = ancestors.length;
    const inComponent = !!componentDepth;

    const exceedsComponentDepth =
      componentDepth >= limitDepthConfig.maxComponents &&
      isComponentElement(node);
    const exceedsDomDepth =
      inComponent &&
      domDepth >= limitDepthConfig.maxDom &&
      !isComponentElement(node);

    if ((exceedsComponentDepth || exceedsDomDepth) && !!node.children.length) {
      console.log("redacting", {
        ancestors,
        componentDepth,
        domDepth,
        inComponent,
        exceedsComponentDepth,
        exceedsDomDepth,
        children: node.children,
      });
      // prune by wiping children and add placeholder comment
      node.children = [{ type: "comment", value: " children redacted " }];
    }
  });
};

const recmaLimitDepth: Plugin<[config: LimitDepthConfig], Program> =
  (config) => (program) => {
    const stack: { isComponent: boolean }[] = [];

    const isComponent = (el: NodeMap["JSXElement"]) => {
      const id = el.openingElement.name;
      return id.type === "JSXIdentifier" && /^[A-Z]/.test(id.name);
    };
    const isFragment = (el: Node) => el.type === "JSXFragment";
    const isElement = (el: Node) => el.type === "JSXElement";

    estreeVisit(program, {
      enter(node) {
        if (isFragment(node)) {
          stack.push({ isComponent: false });
        } else if (isElement(node)) {
          const isComp = isComponent(node);
          stack.push({ isComponent: isComp });

          const componentDepth = stack.filter((f) => f.isComponent).length - 1; // ancestors only
          const domDepth = stack.length;

          const exceeds =
            (componentDepth >= config.maxComponents && isComp) ||
            (componentDepth > 0 && domDepth >= config.maxDom && !isComp);

          if (exceeds && !!node.children.length) {
            const commentId = `CHILDREN_REDACTED:${crypto.randomUUID()}`;
            program.comments?.push({ type: "Block", value: commentId });
            node.children = [
              {
                type: "JSXExpressionContainer",
                expression: { type: "Literal", value: commentId },
              },
            ];
          }
        }
      },
      leave(node) {
        if (isElement(node) || isFragment(node)) stack.pop();
      },
    });
  };

export async function buildInstanceExamples(
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
      limited: unified()
        .use(rehypeLimitDepth, metadata, limitDepthConfig)
        .use(rehypeStripSquashAttribute)
        .use(rehypeUnwrapRefs)
        .use(rehypeStringify),
    },
    jsx: {
      full: unified()
        .use(rehypeStripSquashAttribute)
        .use(rehypeRecma)
        .use(recmaJsx)
        .use(recmaRemoveRedundantFragment)
        .use(recmaWrapAsComponent, "Sample")
        .use(recmaReplaceRefs, { componentRegistry: registry })
        .use(recmaFixProperties)
        .use(recmaStringify),
      limited: unified()
        .use(rehypeStripSquashAttribute)
        .use(rehypeRecma)
        .use(recmaJsx)
        .use(recmaRemoveRedundantFragment)
        .use(recmaWrapAsComponent, "Sample")
        .use(recmaReplaceRefs, { componentRegistry: registry })
        .use(recmaLimitDepth, limitDepthConfig)
        .use(recmaFixProperties)
        .use(recmaStringify),
    },
  };

  return Promise.all(
    instances.map(async (i) => {
      const [jsxFull, jsxLimited, htmlFull, htmlLimited] = await Promise.all([
        processors.jsx.full
          .run({ type: "root", children: [i.ref] })
          .then((estree) => processors.jsx.limited.stringify(estree))
          .then(prettier.ts)
          .then((s) => s.trim()),
        processors.jsx.limited
          .run({ type: "root", children: [i.ref] })
          .then(async (estree) => {
            let ts = await processors.jsx.full.stringify({
              ...estree,
              comments: [],
            });
            estree.comments?.forEach((c) => {
              ts = ts.replace(`{"${c.value}"}`, `{/* children redacted */}`);
            });
            return ts;
          })
          .then(prettier.ts)
          .then((s) => s.trim()),
        processors.html.full
          .run({ type: "root", children: clone(i.children) } as Root)
          .then((t: any) => processors.html.full.stringify(t as Root))
          .then(prettier.html)
          .then((s) => s.trim()),
        processors.html.limited
          .run({ type: "root", children: clone(i.children) } as Root)
          .then((t: any) => processors.html.limited.stringify(t as Root))
          .then(prettier.html)
          .then((s) => s.trim()),
      ]);

      if (
        htmlLimited ===
        `<span class="ant-typography font-semibold"><!-- children redacted --></span>`
      ) {
        console.log(htmlFull);
        console.log("---");
        console.log(htmlLimited);
        throw new Error("check...");
      }
      return {
        jsx: { full: jsxFull, limited: jsxLimited },
        html: { full: htmlFull, limited: htmlLimited },
      };
    })
  );
}
