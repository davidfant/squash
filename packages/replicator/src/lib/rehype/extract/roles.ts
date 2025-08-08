import type { FileSink } from "@/lib/sinks/base";
import { rehypeExtractByMatch } from "./byMatch";

export const rehypeExtractRoles = (sink: FileSink) =>
  rehypeExtractByMatch(sink, (node) => {
    if (node.type !== "element") return null;
    const role = node.properties?.role;
    if (typeof role === "string" && !!role.length) {
      return { dir: `roles/${role}`, name: role };
    }
    return null;
  });
