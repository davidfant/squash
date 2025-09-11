import type { Root } from "hast";
import { visit } from "unist-util-visit";

export const rehypeStripSquashAttribute = () => (tree: Root) => {
  visit(tree, "element", (node, index, parent) => {
    delete node.properties["dataSquashNodeId"];
    if ("dataSquashText" in node.properties && index !== undefined) {
      parent?.children.splice(index, 1, ...node.children);
    }
  });
};
