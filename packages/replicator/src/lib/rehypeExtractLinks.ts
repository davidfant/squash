import type { Element, Root } from "hast";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import type { Context } from "../types";

export const rehypeExtractLinks = (ctx: Context) => () => (tree: Root) => {
  // First pass: collect all link elements and mark them for removal
  const toRemove: Array<{ parent: any; index: number }> = [];

  visit(
    tree,
    "element",
    (node: Element, index: number | undefined, parent: any) => {
      if (node.tagName === "link") {
        // Convert the link element back to HTML string for head insertion
        const linkProcessor = unified().use(rehypeStringify);
        // Create a root node containing just this element for stringify
        const rootWithElement: Root = { type: "root", children: [node] };
        const linkHtml = String(linkProcessor.stringify(rootWithElement));
        ctx.extractedLinks.push(linkHtml);

        // Mark for removal
        if (parent && typeof index === "number") {
          toRemove.push({ parent, index });
        }
      }
    }
  );

  // Remove link elements in reverse order to maintain indices
  toRemove
    .reverse()
    .forEach(({ parent, index }) => parent.children.splice(index, 1));
};
