import type { Node, Program } from "estree";
import { visit } from "estree-util-visit";

const isJSXAttribute = (n: Node, name: string) =>
  n.type === "JSXAttribute" && n.name.name === name;

export function recmaStripSquashAttribute() {
  return (tree: Program) => {
    visit(tree, (node, key, idx, ancestors) => {
      if (node.type !== "JSXElement") return;

      const attrs = node.openingElement.attributes;
      node.openingElement.attributes = attrs.filter(
        (a) => !isJSXAttribute(a, "data-squash-node-id")
      );

      if (attrs.some((a) => isJSXAttribute(a, "data-squash-text"))) {
        const parent = ancestors.at(-1) as any;
        const container: any[] = Array.isArray(parent[key!])
          ? parent[key!]
          : parent[key!].children;
        try {
          container.splice(idx ?? 0, 1, ...node.children);
        } catch (error) {
          console.log("WHAT", {
            // @ts-ignore
            parent,
            container,
            key,
            idx,
            attrs,
          });
          console.dir(parent, { depth: null });
          throw error;
        }
      }
    });
  };
}
