// rehype-unwrap-ref.ts
import type { Root } from "hast";
import { SKIP, visit } from "unist-util-visit";

export const rehypeUnwrapRefs = () => (tree: Root) => {
  visit(tree, "element", (node, index, parent) => {
    if (
      node.tagName.toLowerCase() === "ref" &&
      parent &&
      typeof index === "number"
    ) {
      parent.children.splice(index, 1, ...node.children);
      return [SKIP, index];
    }
  });
};
