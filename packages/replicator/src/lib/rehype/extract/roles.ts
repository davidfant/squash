import { rehypeExtractByMatch } from "./byMatch";

export const rehypeExtractRoles = (templatePath: string) =>
  rehypeExtractByMatch(templatePath, (node) => {
    if (node.type !== "element") return null;
    const role = node.properties?.role;
    if (typeof role === "string" && !!role.length) {
      return { dir: `roles/${role}`, name: role };
    }
    return null;
  });
