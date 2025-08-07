import prettier from "@prettier/sync";
import { transform } from "@svgr/core";
import crypto from "crypto";
import { toHtml } from "hast-util-to-html";
import fs from "node:fs";
import path from "path";
import { visit } from "unist-util-visit";

export function rehypeExtractSVGs(templatePath: string) {
  const svgsDir = path.join(templatePath, "src/components/svgs");
  fs.mkdirSync(svgsDir, { recursive: true });
  const cache: Record<string, string> = {};
  return () => (tree: any) => {
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName !== "svg") return;

      // Extract and store the original classes
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

      const componentName = `Svg_${hash}`;
      const componentPath = path.join(svgsDir, `${componentName}.jsx`);
      const componentTagName = `Components$${path.relative(templatePath, path.join(svgsDir, componentName)).replaceAll("/", "$")}`;
      if (!cache[hash]) {
        const componentCode = transform.sync(pretty, {
          icon: true,
          plugins: [
            "@svgr/plugin-svgo",
            "@svgr/plugin-jsx",
            "@svgr/plugin-prettier",
          ],
        });
        fs.writeFileSync(componentPath, componentCode);
        cache[hash] = componentName;

        // // 1️⃣ inject an ES import into the ESTree that rehype-recma creates
        // (tree.data.estree.body ||= []).unshift({
        //   type: "ImportDeclaration",
        //   specifiers: [
        //     {
        //       type: "ImportDefaultSpecifier",
        //       local: { type: "Identifier", name: componentName },
        //     },
        //   ],
        //   source: { type: "Literal", value: `../icons/${componentName}.jsx` },
        // });
      }

      parent!.children[index!] = {
        type: "element",
        tagName: componentTagName,
        properties: className.length ? { className } : {},
        children: [],
      };
    });
  };
}
