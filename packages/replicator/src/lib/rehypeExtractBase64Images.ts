import crypto from "crypto";
import fs from "node:fs";
import path from "path";
import { visit } from "unist-util-visit";
import type { Stats } from "../types";

export function rehypeExtractBase64Images(stats: Stats, templatePath: string) {
  const imagesDir = path.join(templatePath, "public/images");
  fs.mkdirSync(imagesDir, { recursive: true });
  const cache: Record<string, string> = {};

  return () => (tree: any) => {
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
      const filepath = path.join(imagesDir, filename);

      // Write file if not already cached
      if (!cache[hash]) {
        const buffer = Buffer.from(base64Data!, "base64");
        fs.writeFileSync(filepath, buffer);
        cache[hash] = filename;
        stats.b64Images.unique++;
      }
      stats.b64Images.total++;

      // Update the src attribute to point to the file
      node.properties.src = `/images/${filename}`;
    });
  };
}
