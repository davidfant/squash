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
  "iframe",
]);

export const rehypeExtractTags = (sink: FileSink) =>
  rehypeExtractByMatch(sink, (node) => {
    const tag = node.tagName as string;
    if (typeof tag === "string" && LANDMARK_TAGS.has(tag)) {
      return `layout/${tag}`;
    }
    return null;
  });
