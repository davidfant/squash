import type { FileSink } from "@/lib/sinks/base";
import prettier from "@prettier/sync";
import { transform } from "@svgr/core";
import crypto from "crypto";
import { toHtml } from "hast-util-to-html";
import path from "path";
import { visit } from "unist-util-visit";

export const rehypeExtractSVGs =
  (sink: FileSink) => () => async (tree: any) => {
    const promises: Promise<unknown>[] = [];
    const cache: Record<string, string> = {};
    let nextIndex = 1;
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName !== "svg") return;

      const className: string[] = node.properties?.className || [];

      // Create a copy of the node without classes for hashing and component generation
      const classlessNode = {
        ...node,
        properties: { ...node.properties },
      };

      // Remove classes from the copied node
      delete classlessNode.properties.className;
      delete classlessNode.properties.class;

      // Stringify the node without classes
      const raw = toHtml(classlessNode);
      const pretty = prettier.format(raw, { parser: "html" });
      const hash = crypto
        .createHash("sha256")
        .update(pretty)
        .digest("hex")
        .slice(0, 8);

      // Use incremental names Svg1, Svg2, ... while deduplicating by hash
      const componentName = cache[hash] ?? `Svg${nextIndex++}`;
      const componentPath = path.join("src/svgs", `${componentName}.jsx`);
      const componentTagName = `Components$${path.join("src/svgs", componentName).replaceAll("/", "$")}`;
      if (!cache[hash]) {
        const componentCode = transform.sync(pretty, {
          icon: true,
          plugins: [
            "@svgr/plugin-svgo",
            "@svgr/plugin-jsx",
            "@svgr/plugin-prettier",
          ],
        });

        promises.push(sink.writeText(componentPath, componentCode));
        cache[hash] = componentName;
      }

      parent!.children[index!] = {
        type: "element",
        tagName: componentTagName,
        properties: className.length ? { className } : {},
        children: [],
      };
    });

    await Promise.all(promises);
  };
