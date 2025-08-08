import { config } from "@/config";
import prettier from "@prettier/sync";
import crypto from "crypto";
import type { Root } from "hast";
import { toHtml } from "hast-util-to-html";
import fs from "node:fs/promises";
import path from "path";
import { type Plugin } from "unified";
import { hastToStaticModule, type HastNode } from "../hastToStaticModule";
import { nameComponents, type ComponentSignature } from "../nameComponents";

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function capitalize(input: string): string {
  return input.charAt(0).toUpperCase() + input.slice(1);
}

function computeHash(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 8);
}

/** Describe how to group & name a matched node */
interface MatchResult {
  dir: string;
  name: string;
}

/** The higher-order factory */
export function rehypeExtractByMatch(
  templatePath: string,
  match: (node: HastNode) => MatchResult | null
): Plugin<[], Root> {
  return () => async (tree: Root) => {
    type Occ = {
      id: number;
      parent: HastNode;
      index: number;
      node: HastNode;
      depth: number;
      dir: string;
      name: string;
    };
    const occs: Occ[] = [];

    // DFS collect candidates with depth
    (function walk(node: HastNode, depth = 0) {
      const children: HastNode[] = (node as any).children || [];
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (!child || child.type !== "element") continue;

        const tag = child.tagName as string | undefined;
        // Don't re-extract already-inserted components, but do descend.
        if (typeof tag === "string" && tag.startsWith("Components$src$")) {
          walk(child, depth + 1);
          continue;
        }

        const m = match(child);
        if (m) {
          occs.push({
            id: occs.length,
            parent: node,
            index: i,
            node: child,
            depth: depth + 1,
            dir: m.dir,
            name: m.name,
          });
        }

        walk(child, depth + 1);
      }
    })(tree as any);

    // deepest-first so inners are replaced before outers
    occs.sort((a, b) => b.depth - a.depth);

    if (occs.length === 0) return tree;

    // Group occurrences by directory
    const occsByDir = new Map<string, Occ[]>();
    for (const occ of occs) {
      const list = occsByDir.get(occ.dir) || [];
      list.push(occ);
      occsByDir.set(occ.dir, list);
    }

    // Precompute pretty HTML and fallback hashed names
    const prettyHtmlByOccId = new Map<number, string>();
    const fallbackNameByOccId = new Map<number, string>();
    for (const occ of occs) {
      const raw = toHtml(occ.node as any);
      const pretty = prettier.format(raw, { parser: "html" });
      prettyHtmlByOccId.set(occ.id, pretty);
    }
    for (const list of occsByDir.values()) {
      const isSingle = list.length === 1;
      for (const occ of list) {
        if (isSingle) {
          fallbackNameByOccId.set(occ.id, capitalize(occ.name));
        } else {
          const pretty = prettyHtmlByOccId.get(occ.id)!;
          fallbackNameByOccId.set(
            occ.id,
            `${capitalize(occ.name)}_${computeHash(pretty)}`
          );
        }
      }
    }

    // Helper: clone a node and replace inner matches with placeholder hashed Components$ tags
    function cloneWithInnerPlaceholders(root: HastNode): HastNode {
      const clone = deepClone(root);
      const replace = (node: HastNode, depth = 0) => {
        const children: HastNode[] = (node as any).children || [];
        for (let i = 0; i < children.length; i++) {
          const child = children[i];
          if (!child || child.type !== "element") continue;
          // Only replace descendants, not the root we are naming for
          const m = match(child);
          if (m) {
            const raw = toHtml(child as any);
            const pretty = prettier.format(raw, { parser: "html" });
            const hash = computeHash(pretty);
            const componentName = `${capitalize(m.name)}_${hash}`;
            const outDir = path.join(templatePath, "src/components", m.dir);
            const rel = path
              .relative(templatePath, path.join(outDir, componentName))
              .replaceAll(path.sep, "$");
            const componentTagName = `Components$${rel}`;
            (node as any).children[i] = {
              type: "element",
              tagName: componentTagName,
              properties: {},
              children: [],
            } as any;
            // Do not recurse into replaced child
            continue;
          }
          replace(child, depth + 1);
        }
      };
      replace(clone, 0);
      return clone;
    }

    // Determine final names per occurrence
    const finalNameByOccId = new Map<number, string>(
      Array.from(fallbackNameByOccId.entries())
    );

    if (config.componentNaming.enabled) {
      for (const list of occsByDir.values()) {
        if (list.length <= 1) continue;

        // Build components for naming based on match.name and rendered JSX with inner placeholders
        const components: ComponentSignature[] = [];
        const keys: string[] = [];
        const base = list[0]!.name.toUpperCase();
        list.forEach((occ, idx) => {
          const key = `${base}${idx + 1}`;
          keys.push(key);
          const cloned = cloneWithInnerPlaceholders(occ.node);
          const jsx = toHtml(cloned as any);
          components.push({ id: key, jsx });
        });

        const named = await nameComponents({
          model: config.componentNaming.model,
          components,
        });

        // Ensure unique names within the dir group
        const used = new Set<string>();
        const uniquify = (s: string) => {
          let candidate = s;
          let n = 2;
          while (used.has(candidate)) candidate = `${s}${n++}`;
          used.add(candidate);
          return candidate;
        };

        list.forEach((occ, idx) => {
          const raw = named[keys[idx]!] || fallbackNameByOccId.get(occ.id)!;
          finalNameByOccId.set(occ.id, uniquify(raw));
        });
      }
    }

    // Write files and replace nodes
    const written = new Set<string>();
    for (const occ of occs) {
      const outDir = path.join(templatePath, "src/components", occ.dir);
      await fs.mkdir(outDir, { recursive: true });

      const componentName = finalNameByOccId.get(occ.id)!;
      const componentPath = path.join(outDir, `${componentName}.jsx`);

      const rel = path
        .relative(templatePath, path.join(outDir, componentName))
        .replaceAll(path.sep, "$");
      const componentTagName = `Components$${rel}`;

      if (!written.has(componentPath)) {
        const hastRoot = { type: "root", children: [deepClone(occ.node)] };
        const code = await hastToStaticModule(hastRoot);
        try {
          await fs.access(componentPath);
        } catch {
          await fs.writeFile(componentPath, code, "utf8");
        }
        written.add(componentPath);
      }

      // Replace original with our component tag
      (occ.parent as any).children[occ.index] = {
        type: "element",
        tagName: componentTagName,
        properties: {},
        children: [],
      } as any;
    }

    return tree;
  };
}
