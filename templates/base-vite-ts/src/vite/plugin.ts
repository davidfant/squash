import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

export function errorOverlayPlugin(): Plugin {
  const virtId = "virtual:vite-error-overlay";

  return {
    name: "vite:error-overlay",
    apply: "serve",

    resolveId(id) {
      if (id === virtId) return "\0" + virtId;
    },

    load(id) {
      if (id === "\0" + virtId) {
        return fs.readFileSync(path.join(__dirname, "overlay.js"), "utf8");
      }
    },

    transformIndexHtml() {
      return [
        {
          tag: "script",
          attrs: { type: "module", src: `/@id/${virtId}` },
          injectTo: "body-prepend",
        },
      ];
    },
  };
}
