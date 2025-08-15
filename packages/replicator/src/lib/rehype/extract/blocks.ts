import type { FileSink } from "@/lib/sinks/base";
import crypto from "crypto";
import type { Root } from "hast";
import { toHtml } from "hast-util-to-html";
import path from "path";
import parserHtml from "prettier/plugins/html";
import prettier from "prettier/standalone";
import { type Plugin } from "unified";
import { visit } from "unist-util-visit";
import { hastToStaticModule } from "../../hastToStaticModule";
import { createSlot } from "../slot";

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

export const rehypeExtractBlocks =
  (sink: FileSink): Plugin<[], Root> =>
  () =>
  async (tree: Root) => {
    const blocksPath = "components/blocks";
    const occs: Occurrence[] = [];

    // Pass 1: collect signatures for all element subtrees (excluding svg; already handled)
    visit(
      tree,
      "element",
      (
        node: HastNode,
        index: number | undefined,
        parent: HastNode | undefined
      ) => {
        if (node.tagName === "slot") return;
        if (!parent || index == null) return;

        const normalized = normalizeForSignature(node);
        const html = toHtml(normalized);
        occs.push({ parent, index, node });
      }
    );

    const table = new Map<string, Occurrence[]>();
    await Promise.all(
      occs.map(async (occ) => {
        const pretty = await prettier.format(
          toHtml(normalizeForSignature(occ.node), { closeSelfClosing: true }),
          { parser: "html", plugins: [parserHtml] }
        );
        const occs = table.get(pretty) || [];
        table.set(pretty, occs);
      })
    );

    // Select candidates: repeated and above size threshold
    const MIN_OCCURRENCES = 2;
    const MIN_NODE_COUNT = 4;
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
      const componentPath = path.join(
        "src",
        blocksPath,
        `${componentName}.tsx`
      );

      try {
        const firstNode = viable[0]!.node;
        const hastRoot = { type: "root", children: [deepClone(firstNode)] };
        const moduleCode = await hastToStaticModule(hastRoot);
        await sink.writeText(componentPath, moduleCode);

        // Replace all viable occurrences with the component tag
        for (const { parent, index, node } of viable) {
          parent.children[index] = createSlot({
            importPath: path.join("@", blocksPath, componentName),
          });
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
