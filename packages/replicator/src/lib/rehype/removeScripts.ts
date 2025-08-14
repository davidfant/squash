import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";

/**
 * Rehype plugin that removes all script tags from the HTML tree.
 * This includes both inline scripts and scripts with src attributes.
 */
export const rehypeRemoveScripts = () => (tree: Root) => {
  // Collect all script elements to remove
  const toRemove: Array<{ parent: any; index: number }> = [];

  visit(
    tree,
    "element",
    (node: Element, index: number | undefined, parent: any) => {
      if (node.tagName === "script") {
        // Mark for removal
        if (parent && typeof index === "number") {
          toRemove.push({ parent, index });
        }
      }
    }
  );

  // Remove script elements in reverse order to maintain indices
  toRemove
    .reverse()
    .forEach(({ parent, index }) => parent.children.splice(index, 1));
};
