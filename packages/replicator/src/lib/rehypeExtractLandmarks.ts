import type { Stats } from "@/types";
import prettier from "@prettier/sync";
import crypto from "crypto";
import type { Root } from "hast";
import { toHtml } from "hast-util-to-html";
import fs from "node:fs/promises";
import path from "path";
import recmaJsx from "recma-jsx";
import recmaStringify from "recma-stringify";
import rehypeRecma from "rehype-recma";
import { unified, type Plugin } from "unified";
import { recmaExtractJSXComponents } from "./recmaExtractJSXComponents";

type HastNode = any;

const LANDMARK_TAGS = new Set([
  "header",
  "main",
  "section",
  "nav",
  "aside",
  "footer",
  "dialog",
]);

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

async function hastToStaticModule(hastRoot: HastNode): Promise<string> {
  const tmpStats: Stats = {
    svgs: { total: 0, unique: 0 },
    b64Images: { total: 0, unique: 0 },
    blocks: { total: 0, unique: 0 },
  };
  const processor = unified()
    .use(rehypeRecma)
    .use(recmaJsx)
    .use(recmaExtractJSXComponents(tmpStats))
    .use(recmaStringify);
  const estree = await processor.run(hastRoot as any);
  const js = String(processor.stringify(estree as any));
  return prettier.format(js, { parser: "babel" });
}

function capitalize(input: string): string {
  return input.charAt(0).toUpperCase() + input.slice(1);
}

interface Occurrence {
  parent: HastNode;
  index: number;
  node: HastNode;
  depth: number;
}

export function rehypeExtractLandmarks(templatePath: string): Plugin<[], Root> {
  const outDir = path.join(templatePath, "src/components/landmarks");

  return () => async (tree: Root) => {
    await fs.mkdir(outDir, { recursive: true });

    const occs: Occurrence[] = [];

    // Manual DFS to track depth and prevent extracting nested landmarks inside another landmark
    function walk(node: HastNode, parent: HastNode | null, depth: number) {
      const children: HastNode[] = (node as any).children || [];
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (!child || child.type !== "element") continue;
        const tag = child.tagName;
        if (typeof tag === "string" && LANDMARK_TAGS.has(tag)) {
          occs.push({ parent: node, index: i, node: child, depth });
          // Skip walking into this landmark so we only extract top-most landmarks
          continue;
        }
        walk(child, node, depth + 1);
      }
    }

    walk(tree as any, null, 0);

    // Sort by shallowest first to avoid overlapping replacements
    occs.sort((a, b) => a.depth - b.depth);

    const replaced = new WeakSet<HastNode>();
    for (const { parent, index, node } of occs) {
      if (replaced.has(node)) continue;
      const tag = node.tagName as string;
      const raw = toHtml(node as any);
      const pretty = prettier.format(raw, { parser: "html" });
      const hash = crypto
        .createHash("sha256")
        .update(pretty)
        .digest("hex")
        .slice(0, 8);
      const componentName = `${capitalize(tag)}_${hash}`;
      const componentPath = path.join(outDir, `${componentName}.jsx`);
      const componentTagName = `Components$${path
        .relative(templatePath, path.join(outDir, componentName))
        .replaceAll(path.sep, "$")}`;

      // Write the component file if missing
      try {
        await fs.access(componentPath);
      } catch {
        const hastRoot = { type: "root", children: [deepClone(node)] };
        const moduleCode = await hastToStaticModule(hastRoot);
        await fs.writeFile(componentPath, moduleCode, "utf8");
      }

      // Replace the landmark with the component tag
      (parent as any).children[index] = {
        type: "element",
        tagName: componentTagName,
        properties: {},
        children: [],
      } as any;

      replaced.add(node);
    }

    return tree;
  };
}
