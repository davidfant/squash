import { rehypeExtractByMatch } from "./rehypeExtractByMatch";

export const rehypeExtractRoles = (templatePath: string) =>
  rehypeExtractByMatch(templatePath, (node) => {
    if (node.type !== "element") return null;
    const role = node.properties?.role;
    if (typeof role === "string" && role.length > 0) {
      return { outParts: ["roles", role], nameHint: role };
    }
    return null;
  });
