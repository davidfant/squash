import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";
import type { Context } from "../../../types";

/**
 * Rehype plugin that extracts body tag attributes and removes the body tag wrapper,
 * keeping only its children for further processing.
 */
export const rehypeExtractBodyAttributes =
  (ctx: Context) => () => (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName === "body") {
        if (node.properties) {
          ctx.bodyAttributes = convertPropertiesToAttributes(node.properties);
        }

        return "skip";
      }
    });
  };

/**
 * Convert hast properties to HTML attribute strings
 * Handles className -> class conversion and other property transformations
 */
function convertPropertiesToAttributes(
  properties: Record<string, any>
): Record<string, string | number | boolean> {
  const attributes: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(properties)) {
    if (value === null || value === undefined) continue;

    // Convert className to class
    if (key === "className") {
      if (Array.isArray(value)) {
        attributes["class"] = value.join(" ");
      } else {
        attributes["class"] = String(value);
      }
    }
    // Handle other special cases if needed
    else if (typeof value === "boolean") {
      if (value) {
        attributes[key] = true;
      }
      // Skip false boolean attributes
    } else {
      attributes[key] = value;
    }
  }

  return attributes;
}
