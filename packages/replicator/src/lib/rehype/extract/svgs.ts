import type { FileSink } from "@/lib/sinks/base";
import { transform } from "@svgr/core";
import svgrPluginJsx from "@svgr/plugin-jsx";
import svgrPluginPrettier from "@svgr/plugin-prettier";
import svgrPluginSvgo from "@svgr/plugin-svgo";
import crypto from "crypto";
import { toHtml } from "hast-util-to-html";
import path from "path";
import parserHtml from "prettier/plugins/html";
import prettier from "prettier/standalone";
import { visit } from "unist-util-visit";

export const rehypeExtractSVGs =
  (sink: FileSink) => () => async (tree: any) => {
    type Occurrence = {
      parent: any;
      index: number;
      className: string[];
      raw: string;
    };

    const occs: Occurrence[] = [];

    // Collect SVGs synchronously
    visit(tree, "element", (node, index, parent) => {
      if (!parent || index == null) return;
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

      // Stringify the node without classes; postpone expensive work to async phase
      const raw = toHtml(classlessNode);
      occs.push({ parent, index, className, raw });
    });

    if (occs.length === 0) return;

    const prettyList = await Promise.all(
      occs.map((o) =>
        prettier.format(o.raw, { parser: "html", plugins: [parserHtml] })
      )
    );

    const hashToComponentName = new Map<string, string>();

    let nextIndex = 1;
    await Promise.all(
      prettyList.map(async (pretty) => {
        const hash = crypto
          .createHash("sha256")
          .update(pretty)
          .digest("hex")
          .slice(0, 8);
        if (!hashToComponentName.has(hash)) {
          const componentName = `Svg${nextIndex++}`;
          hashToComponentName.set(hash, componentName);
          const componentPath = path.join("src/svgs", `${componentName}.jsx`);
          const code = await transform(pretty, {
            icon: true,
            plugins: [svgrPluginSvgo, svgrPluginJsx, svgrPluginPrettier],
          });
          sink.writeText(componentPath, code);
        }
      })
    );

    prettyList.forEach((pretty, i) => {
      const hash = crypto
        .createHash("sha256")
        .update(pretty)
        .digest("hex")
        .slice(0, 8);
      const componentName = hashToComponentName.get(hash)!;
      const componentTagName = `Components$${path
        .join("src/svgs", componentName)
        .replaceAll("/", "$")}`;
      const { parent, index, className } = occs[i]!;
      parent.children[index] = {
        type: "element",
        tagName: componentTagName,
        properties: className.length ? { className } : {},
        children: [],
      };
    });
  };
