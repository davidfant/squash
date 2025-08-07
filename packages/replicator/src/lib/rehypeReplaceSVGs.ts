import prettier from "@prettier/sync";
import { transform } from "@svgr/core";
import crypto from "crypto";
import { toHtml } from "hast-util-to-html";
import fs from "node:fs";
import path from "path";
import { visit } from "unist-util-visit";

export function rehypeReplaceSVGs(templatePath: string) {
  const svgsDir = path.join(templatePath, "src/components/svgs");
  fs.mkdirSync(svgsDir, { recursive: true });
  const cache: Record<string, string> = {};
  return () => (tree: any) => {
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName !== "svg") return;

      const raw = toHtml(node);
      const pretty = prettier.format(raw, { parser: "html" });
      const hash = crypto
        .createHash("sha256")
        .update(pretty)
        .digest("hex")
        .slice(0, 8);

      const componentName = `Svg_${hash}`;
      const componentPath = path.join(svgsDir, `${componentName}.jsx`);
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

      // 2️⃣ swap the node → <Svg_ab12cd34 />
      parent!.children[index!] = {
        type: "element",
        tagName: `Components.${Buffer.from(componentPath).toString("base64")}`,
        properties: {},
        children: [],
      };
    });
  };
}
