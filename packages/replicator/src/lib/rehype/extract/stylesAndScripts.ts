import type { Element, Root } from "hast";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import type { Context } from "../../../types";

export const rehypeExtractStylesAndScripts =
  (ctx: Context) => () => (tree: Root) => {
    // First pass: collect all link elements and mark them for removal
    const toRemove: Array<{ parent: any; index: number }> = [];
    const tagProcessor = unified().use(rehypeStringify);

    visit(
      tree,
      "element",
      (node: Element, index: number | undefined, parent: any) => {
        if (["link", "script", "style"].includes(node.tagName)) {
          // Convert the link element back to HTML string for head insertion
          // Create a root node containing just this element for stringify
          const rootWithElement: Root = { type: "root", children: [node] };
          const html = String(tagProcessor.stringify(rootWithElement));
          ctx.tagsToMoveToHead.push(html);

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
