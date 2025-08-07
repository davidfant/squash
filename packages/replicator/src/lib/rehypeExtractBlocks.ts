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
import { visit } from "unist-util-visit";
import { recmaExtractJSXComponents } from "./recmaExtractJSXComponents";

type HastNode = any;

interface Occurrence {
  parent: HastNode;
  index: number;
  node: HastNode;
}

function countNodes(node: HastNode): number {
  return (
    1 +
    (node.children || []).reduce(
      (sum: number, child: HastNode) => sum + countNodes(child),
      0
    )
  );
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function normalizeForSignature(node: HastNode): HastNode {
  const clone = deepClone(node);

  const normalize = (n: HastNode) => {
    if (!n || typeof n !== "object") return;
    if (n.type === "element") {
      const props = (n.properties ||= {});
      // Remove highly-unique or irrelevant props
      delete (props as any).id;
      delete (props as any).nonce;
      delete (props as any).integrity;
      delete (props as any).crossorigin;
      // Drop event handlers
      for (const key of Object.keys(props)) {
        if (/^on[A-Z]/.test(key)) delete (props as any)[key];
      }
      // Normalize className/class to sorted tokens
      let classTokens: string[] = [];
      if (props.className) {
        classTokens = Array.isArray(props.className)
          ? props.className
          : String(props.className).split(/\s+/);
      } else if (props.class) {
        classTokens = String(props.class).split(/\s+/);
      }
      if (classTokens.length) {
        const unique = Array.from(new Set(classTokens.filter(Boolean))).sort();
        delete (props as any).class;
        (props as any).className = unique;
      }
    } else if (n.type === "text") {
      n.value = String(n.value || "")
        .replace(/\s+/g, " ")
        .trim();
    }
    (n.children || []).forEach(normalize);
  };

  normalize(clone);
  return clone;
}

async function hastToComponentModule(hastRoot: HastNode): Promise<string> {
  // Produce a JS module that default-exports a component rendering the HAST
  // Reuse the same recma pipeline so Components$... tags get proper imports
  const localStats = {
    svgs: { total: 0, unique: 0 },
    b64Images: { total: 0, unique: 0 },
    blocks: { total: 0, unique: 0 },
  } as const;
  const processor = unified()
    .use(rehypeRecma)
    .use(recmaJsx)
    .use(recmaExtractJSXComponents(localStats))
    .use(recmaStringify);

  const estree = await processor.run(hastRoot as any);
  const js = String(processor.stringify(estree as any));
  return prettier.format(js, { parser: "babel" });
}

export function rehypeExtractBlocks(templatePath: string): Plugin<[], Root> {
  const blocksDir = path.join(templatePath, "src/components/blocks");

  return () => async (tree: Root) => {
    await fs.mkdir(blocksDir, { recursive: true });

    const table = new Map<string, Occurrence[]>();

    // Pass 1: collect signatures for all element subtrees (excluding svg; already handled)
    visit(
      tree,
      "element",
      (
        node: HastNode,
        index: number | undefined,
        parent: HastNode | undefined
      ) => {
        if (node.tagName.startsWith("Components$src$")) return;
        if (!parent || index == null) return;

        const normalized = normalizeForSignature(node);
        const html = toHtml(normalized);
        const pretty = prettier.format(html, { parser: "html" });
        const sig = pretty;

        const occs = table.get(sig) || [];
        occs.push({ parent, index, node });
        table.set(sig, occs);
      }
    );

    // Select candidates: repeated and above size threshold
    const MIN_OCCURRENCES = 2;
    const MIN_NODE_COUNT = 2;
    const candidates = Array.from(table.entries())
      .filter(
        ([, occs]) =>
          occs.length >= MIN_OCCURRENCES &&
          countNodes(occs[0]!.node) >= MIN_NODE_COUNT
      )
      .sort((a, b) => countNodes(b[1][0]!.node) - countNodes(a[1][0]!.node));

    const replaced = new WeakSet<HastNode>();
    const replacedParents = new WeakSet<HastNode>();

    for (const [sig, occs] of candidates) {
      // Skip if any occurrence's ancestor was already replaced (coarse check: parent flagged)
      const viable = occs.filter(
        ({ parent, node }) =>
          !replaced.has(node) && !replacedParents.has(parent)
      );
      if (viable.length < MIN_OCCURRENCES) continue;

      // Create component once per signature
      const hash = crypto
        .createHash("sha256")
        .update(sig)
        .digest("hex")
        .slice(0, 8);
      const componentName = `Block_${hash}`;
      const componentPath = path.join(blocksDir, `${componentName}.jsx`);
      const componentTagName = `Components$${path
        .relative(templatePath, path.join(blocksDir, componentName))
        .replaceAll(path.sep, "$")}`;

      try {
        // Write component file if not present
        try {
          await fs.access(componentPath);
        } catch {
          const firstNode = viable[0]!.node;
          const hastRoot = { type: "root", children: [deepClone(firstNode)] };
          const moduleCode = await hastToComponentModule(hastRoot);
          await fs.writeFile(componentPath, moduleCode, "utf8");
        }

        // Replace all viable occurrences with the component tag
        for (const { parent, index, node } of viable) {
          parent.children[index] = {
            type: "element",
            tagName: componentTagName,
            properties: {},
            children: [],
          } as HastNode;
          replaced.add(node);
          replacedParents.add(parent);
        }
      } catch (err) {
        // Fail softly per signature
        // eslint-disable-next-line no-console
        console.warn(`[rehypeExtractBlocks] Failed for ${componentName}:`, err);
      }
    }

    return tree;
  };
}
