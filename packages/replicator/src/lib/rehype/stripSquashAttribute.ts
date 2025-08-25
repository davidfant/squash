import type { Root } from "hast";
import { visit } from "unist-util-visit";

export const rehypeStripSquashAttribute = () => (tree: Root) => {
  visit(tree, "element", (node) => {
    delete node.properties["dataSquashNodeId"];
  });
};
