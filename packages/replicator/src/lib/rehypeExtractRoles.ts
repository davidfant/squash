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

export function rehypeExtractRoles(templatePath: string): Plugin<[], Root> {
  return () => async (tree: Root) => {
    const occs: Array<{
      parent: HastNode;
      index: number;
      node: HastNode;
      depth: number;
    }> = [];

    // Collect role-bearing elements that are not already replaced by earlier passes
    (function walk(node: HastNode, depth = 0) {
      const children: HastNode[] = (node as any).children || [];
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (!child || child.type !== "element") continue;
        const tag = child.tagName as string;
        if (typeof tag === "string" && tag.startsWith("Components$src$")) {
          // Do not extract this node again by role, but still inspect its subtree
          walk(child, depth + 1);
          continue;
        }
        const role = child.properties?.role;
        if (typeof role === "string" && role.length > 0) {
          occs.push({ parent: node, index: i, node: child, depth: depth + 1 });
        }
        walk(child, depth + 1);
      }
    })(tree as any);

    // Process deepest-first so inner role elements are extracted before their parents
    occs.sort((a, b) => b.depth - a.depth);

    // Process each occurrence; write components grouped by role and structure hash
    const written = new Set<string>();
    for (const { parent, index, node } of occs) {
      const role = String(node.properties.role);
      const raw = toHtml(node as any);
      const pretty = prettier.format(raw, { parser: "html" });
      const hash = crypto
        .createHash("sha256")
        .update(pretty)
        .digest("hex")
        .slice(0, 8);
      const roleDir = path.join(templatePath, "src/components/roles", role);
      await fs.mkdir(roleDir, { recursive: true });
      const componentName = `${capitalize(role)}_${hash}`;
      const componentPath = path.join(roleDir, `${componentName}.jsx`);

      const rel = path
        .relative(templatePath, path.join(roleDir, componentName))
        .replaceAll(path.sep, "$");
      const componentTagName = `Components$${rel}`;

      if (!written.has(componentPath)) {
        const hastRoot = { type: "root", children: [deepClone(node)] };
        const code = await hastToStaticModule(hastRoot);
        try {
          await fs.access(componentPath);
        } catch {
          await fs.writeFile(componentPath, code, "utf8");
        }
        written.add(componentPath);
      }

      // Replace original with component tag (no additional props)
      (parent as any).children[index] = {
        type: "element",
        tagName: componentTagName,
        properties: {},
        children: [],
      } as any;
    }

    return tree;
  };
}
