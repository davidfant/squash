import type { FileSink } from "@/lib/sinks/base";
import crypto from "crypto";
import path from "path";
import { visit } from "unist-util-visit";

export function rehypeExtractBase64Images(sink: FileSink) {
  const cache: Record<string, string> = {};
  return () => async (tree: any) => {
    const promises: Promise<unknown>[] = [];
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName !== "img") return;

      const src = node.properties?.src;
      if (!src || typeof src !== "string") return;

      // Check if it's a base64 data URL
      const base64Match = src.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
      if (!base64Match) return;

      const [, mimeType, base64Data] = base64Match;

      // Determine file extension from mime type
      const extensionMap: Record<string, string> = {
        jpeg: "jpg",
        jpg: "jpg",
        png: "png",
        gif: "gif",
        webp: "webp",
        "svg+xml": "svg",
      };

      const extension = extensionMap[mimeType!] || "png";

      // Create hash of the base64 data
      const hash = crypto
        .createHash("sha256")
        .update(base64Data!)
        .digest("hex")
        .slice(0, 16);

      const filename = `${hash}.${extension}`;
      const filepath = path.join("public/images", filename);

      // Write file if not already cached
      if (!cache[hash]) {
        const buffer = Buffer.from(base64Data!, "base64");
        promises.push(sink.writeBytes(filepath, buffer));
        cache[hash] = filename;
      }

      // Update the src attribute to point to the file
      node.properties.src = `/images/${filename}`;
    });

    await Promise.all(promises);
  };
}
