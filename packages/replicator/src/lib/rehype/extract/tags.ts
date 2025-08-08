import type { FileSink } from "@/lib/sinks/base";
import { rehypeExtractByMatch } from "./byMatch";

const LANDMARK_TAGS = new Set([
  "header",
  "main",
  "section",
  "nav",
  "aside",
  "footer",
  "dialog",
  "table",
]);

export const rehypeExtractTags = (sink: FileSink) =>
  rehypeExtractByMatch(sink, (node) => {
    const tag = node.tagName as string;
    if (typeof tag === "string" && LANDMARK_TAGS.has(tag)) {
      return { dir: `layout/${tag}`, name: tag };
    }
    return null;
  });
