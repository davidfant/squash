import type { FileSink } from "@/lib/sinks/base";
import crypto from "crypto";
import { toHtml } from "hast-util-to-html";
import path from "path";
import parserBabel from "prettier/plugins/babel";
import parserEstree from "prettier/plugins/estree";
import parserHtml from "prettier/plugins/html";
import prettier from "prettier/standalone";
import recmaJsx from "recma-jsx";
import recmaStringify from "recma-stringify";
import rehypeParse from "rehype-parse";
import rehypeRecma from "rehype-recma";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { recmaExtractJSXComponents } from "../../recmaExtractJSXComponents";
import { createSlot } from "../slot";

// SVGR-free: reuse the same HAST -> JSX pipeline used elsewhere, then wrap with a named component and inject {...props}
async function svgToComponent(
  componentName: string,
  rawSvg: string
): Promise<string> {
  const vfile = await unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeRecma)
    .use(recmaJsx)
    .use(recmaExtractJSXComponents)
    .use(recmaStringify)
    .process(rawSvg);

  const moduleJs = String(vfile);

  // Extract the JSX expression from `export default () => <svg ... />;`
  const match = moduleJs.match(/export default \(\) => ([\s\S]*);\s*$/);
  const jsx: string = match?.[1] ?? moduleJs;

  // Inject props spread into root <svg>
  const jsxWithProps = jsx
    .replace(/<svg(\b[^>]*)\/>/s, (_m, attrs) => `<svg${attrs} {...props} />`)
    .replace(/<svg(\b[^>]*)>/s, (_m, attrs) => `<svg${attrs} {...props}>`);

  const wrapped = `export default function ${componentName}(props) { return ${jsxWithProps}; }`;

  return prettier.format(wrapped, {
    parser: "babel",
    plugins: [parserBabel, parserEstree],
  });
}

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
          const componentPath = path.join("src/svgs", `${componentName}.tsx`);
          const code = await svgToComponent(componentName, pretty);
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
      const { parent, index, className } = occs[i]!;
      parent.children[index] = createSlot({
        importPath: path.join("@/svgs", componentName),
        props: !!className.length ? { className } : undefined,
      });
    });
  };
