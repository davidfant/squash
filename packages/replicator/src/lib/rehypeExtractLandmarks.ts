import { rehypeExtractByMatch } from "./rehypeExtractByMatch";

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

export const rehypeExtractLandmarks = (templatePath: string) =>
  rehypeExtractByMatch(templatePath, (node) => {
    const tag = node.tagName as string;
    if (typeof tag === "string" && LANDMARK_TAGS.has(tag)) {
      return { outParts: ["layout", tag], nameHint: tag };
    }
    return null;
  });
