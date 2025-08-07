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
import { visit } from "unist-util-visit";
import { recmaExtractJSXComponents } from "./recmaExtractJSXComponents";

type HastNode = any;

interface Occurrence {
  parent: HastNode;
  index: number;
  node: HastNode;
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
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

// Build a shape-only signature: tag names + attribute keys (not values) + text node markers
function buildShapeSignature(node: HastNode): string {
  const clone = deepClone(node);
  const normalize = (n: HastNode) => {
    if (n.type === "element") {
      const props = (n.properties ||= {});
      const keys = Object.keys(props)
        .filter((k) => k !== "class" && k !== "className")
        .sort();
      const next: Record<string, any> = {};
      for (const k of keys) next[k] = true; // only presence matters
      // Normalize class to presence only
      if (props.className || props.class) next.className = true;
      n.properties = next;
    } else if (n.type === "text") {
      n.value = "__TEXT__";
    }
    (n.children || []).forEach(normalize);
  };
  normalize(clone);
  const html = toHtml(clone);
  return prettier.format(html, { parser: "html" });
}

// Traverse subtree in pre-order and collect nodes
function flattenNodesPreorder(
  node: HastNode,
  list: HastNode[] = []
): HastNode[] {
  list.push(node);
  for (const child of node.children || []) flattenNodesPreorder(child, list);
  return list;
}

function isParamAttr(key: string): boolean {
  // Consider all attributes except class/className for parameterization when they differ
  return key !== "class" && key !== "className";
}

function normalizeForCompare(value: unknown): string {
  if (value == null) return "__undefined__";
  if (Array.isArray(value)) return JSON.stringify(value.map(String));
  if (typeof value === "object") {
    try {
      return JSON.stringify(
        value,
        Object.keys(value as Record<string, unknown>).sort()
      );
    } catch {
      return String(value);
    }
  }
  return String(value);
}

// Convert HAST root with one child into a JS module, then we will postprocess to inject props
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

export function rehypeExtractNearDuplicateBlocks(
  templatePath: string,
  stats: Stats
): Plugin<[], Root> {
  const blocksDir = path.join(templatePath, "src/components/blocks");

  return () => async (tree: Root) => {
    await fs.mkdir(blocksDir, { recursive: true });

    const table = new Map<string, Occurrence[]>();

    // Collect occurrences grouped by shape signature
    visit(
      tree,
      "element",
      (
        node: HastNode,
        index: number | undefined,
        parent: HastNode | undefined
      ) => {
        if (!parent || index == null) return;
        if (node.tagName.startsWith("Components$src$")) return;

        const sig = buildShapeSignature(node);
        const list = table.get(sig) || [];
        list.push({ parent, index, node });
        table.set(sig, list);
      }
    );

    const MIN_OCCURRENCES = 2;
    const MIN_NODE_COUNT = 5;

    const candidates = Array.from(table.entries())
      .filter(
        ([, occs]) =>
          occs.length >= MIN_OCCURRENCES &&
          countNodes(occs[0]!.node) >= MIN_NODE_COUNT
      )
      .sort((a, b) => countNodes(b[1][0]!.node) - countNodes(a[1][0]!.node));

    const replaced = new WeakSet<HastNode>();
    const replacedParents = new WeakSet<HastNode>();

    for (const [shapeSig, occs] of candidates) {
      const viable = occs.filter(
        ({ parent, node }) =>
          !replaced.has(node) && !replacedParents.has(parent)
      );
      if (viable.length < MIN_OCCURRENCES) continue;

      // Build per-position diffs across occurrences
      const flatLists = viable.map((o) => flattenNodesPreorder(o.node));
      const ref = flatLists[0]!;
      const props: {
        key: string;
        atIndex: number;
        kind: "attr" | "text";
        attrName?: string;
      }[] = [];

      // Helper to propose a prop name that is unique
      const usedPropNames = new Set<string>();
      const makePropName = (base: string) => {
        let name = base;
        let i = 1;
        while (usedPropNames.has(name)) {
          name = `${base}${i++}`;
        }
        usedPropNames.add(name);
        return name;
      };

      // Class intersection for root
      const rootClassSets = viable.map(
        ({ node }) =>
          new Set<string>(
            Array.isArray(node.properties?.className)
              ? (node.properties.className as string[])
              : typeof node.properties?.className === "string"
                ? String(node.properties.className).split(/\s+/)
                : []
          )
      );
      const baseClasses = Array.from(rootClassSets[0] as Set<string>).filter(
        (t) => rootClassSets.every((s) => (s as Set<string>).has(t))
      );

      const diffs: Array<{
        atIndex: number;
        kind: "attr" | "text";
        attrName?: string;
        values: any[];
      }>[] = [] as any;
      const paramPoints: Array<{
        atIndex: number;
        kind: "attr" | "text";
        attrName?: string;
        propName: string;
      }> = [];

      for (let i = 0; i < ref.length; i++) {
        const n0 = ref[i]!;
        if (n0.type === "element") {
          const props0 = n0.properties || {};
          // attributes to consider (expand: any attribute except class/className)
          for (const key of Object.keys(props0)) {
            if (!isParamAttr(key)) continue;
            const values = flatLists.map((list) => list[i]?.properties?.[key]);
            const uniq = new Set(values.map(normalizeForCompare));
            if (uniq.size > 1) {
              const base = key
                .replace(/^data-/, "data")
                .replace(/-([a-z])/g, (_, c) => c.toUpperCase());
              const propName = makePropName(base);
              paramPoints.push({
                atIndex: i,
                kind: "attr",
                attrName: key,
                propName,
              });
            }
          }
        } else if (n0.type === "text") {
          const values = flatLists
            .map((list) => list[i]?.value || "")
            .map((v) => String(v).trim());
          const uniq = new Set(values);
          if (uniq.size > 1) {
            const propName = makePropName("text");
            paramPoints.push({ atIndex: i, kind: "text", propName });
          }
        }
        // no cap: allow all differing attributes/text to become props
      }

      if (paramPoints.length === 0) continue; // nothing to parameterize

      // Create component HAST for first occurrence with placeholders
      const compNode = deepClone(viable[0]!.node);
      const flatComp = flattenNodesPreorder(compNode);
      for (const p of paramPoints) {
        const target = flatComp[p.atIndex]!;
        if (p.kind === "attr") {
          target.properties ||= {};
          if (p.attrName === "style") {
            // Avoid invalid inline CSS during codegen; store placeholder on a data-prop attribute
            delete target.properties.style;
            target.properties[`data-prop-${p.propName}`] =
              `__PROP_${p.propName}__`;
          } else {
            target.properties[p.attrName!] = `__PROP_${p.propName}__`;
          }
        } else {
          target.value = `__PROP_${p.propName}__`;
        }
      }

      // Normalize root class to intersection
      if (baseClasses.length > 0 && compNode.type === "element") {
        compNode.properties ||= {};
        compNode.properties.className = baseClasses;
      }

      // Generate static module code
      const hash = crypto
        .createHash("sha256")
        .update(shapeSig + JSON.stringify(paramPoints.map((p) => p.propName)))
        .digest("hex")
        .slice(0, 8);
      const componentName = `Block_${hash}`;
      const componentPath = path.join(blocksDir, `${componentName}.jsx`);
      const componentTagName = `Components$${path.relative(templatePath, path.join(blocksDir, componentName)).replaceAll(path.sep, "$")}`;

      const hastRoot = { type: "root", children: [compNode] };
      let moduleCode = await hastToStaticModule(hastRoot);

      // Postprocess: inject props and className merging
      const propList = [...paramPoints.map((p) => p.propName), "className"];

      // Replace placeholders with JSX expressions
      for (const p of paramPoints) {
        const token = `__PROP_${p.propName}__`;
        // 1) Replace expression containers wrapping a string literal: {"__PROP_x__"} or {'__PROP_x__'}
        moduleCode = moduleCode.replace(
          new RegExp(`\\{\\s*(["'])${token}\\1\\s*\\}`, "g"),
          `{${p.propName}}`
        );
        // 2) Replace quoted string literals: "__PROP_x__" or '__PROP_x__' (attributes)
        moduleCode = moduleCode.replace(
          new RegExp(`(["'])${token}\\1`, "g"),
          `{${p.propName}}`
        );
        // 3) Replace bare tokens in text context
        moduleCode = moduleCode.replace(
          new RegExp(token, "g"),
          `{${p.propName}}`
        );
      }
      // Turn style placeholders into JSX bindings: data-prop-<prop>={prop} -> style={prop}
      for (const p of paramPoints) {
        if (p.kind === "attr" && p.attrName === "style") {
          // After previous replacements, the placeholder should be an expression
          moduleCode = moduleCode.replace(
            new RegExp(`\\sdata-prop-${p.propName}=\\{${p.propName}\\}`, "g"),
            ` style={${p.propName}}`
          );
        }
      }
      // Collapse any accidental double braces like {{prop}} -> {prop}
      moduleCode = moduleCode.replace(
        /\{\s*\{\s*([a-zA-Z_$][\w$]*)\s*\}\s*\}/g,
        `{$1}`
      );

      // Merge className on root element by rewriting the opening tag to ensure a single className
      const base = baseClasses.join(" ");
      moduleCode = moduleCode.replace(
        /<([A-Za-z][^\s/>]*)([^>]*)>/,
        (full, tag, attrs) => {
          // remove any existing className on the root opening tag
          const cleaned = String(attrs).replace(
            /\sclassName=\{[^}]*\}|\sclassName=\"[^\"]*\"|\sclassName='[^']*'/g,
            ""
          );
          const expr = base
            ? `{["${base}", className].filter(Boolean).join(" ")}`
            : `{className}`;
          return `<${tag}${cleaned} className=${expr}>`;
        }
      );

      // Ensure function signature includes props (with className defaulting to empty string)
      const uniqueProps = Array.from(new Set(propList));
      const paramSig = uniqueProps
        .map((p) => (p === "className" ? `${p} = ""` : p))
        .join(", ");
      moduleCode = moduleCode.replace(
        /export default \(\) =>/,
        `export default ({ ${paramSig} } = {}) =>`
      );

      // Write component file
      await fs.writeFile(componentPath, moduleCode, "utf8");

      // Replace occurrences with the new component tags, adding per-instance props
      for (const { parent, index, node } of viable) {
        // Compute per-instance prop values
        const flat = flattenNodesPreorder(node);
        const propsObj: Record<string, any> = {};
        for (const p of paramPoints) {
          if (p.kind === "attr") {
            const value = flat[p.atIndex]?.properties?.[p.attrName!];
            // Preserve original types: arrays/objects as-is, primitives stringified if needed
            if (p.attrName === "style" && typeof value === "string") {
              // Convert inline CSS string to a style object as-is if parsable later by React;
              // leave as string to be bound as style={string} (React accepts object only; consumers can adjust).
              // To avoid breaking, pass the raw string; the component will set style={prop} which should be an object.
              propsObj[p.propName] = value;
            } else {
              propsObj[p.propName] = value as any;
            }
          } else {
            const value = flat[p.atIndex]?.value ?? "";
            propsObj[p.propName] = String(value).trim();
          }
        }
        // Class extras: tokens present in this occurrence root minus base
        const occRootTokens = new Set<string>(
          Array.isArray(node.properties?.className)
            ? (node.properties.className as string[])
            : typeof node.properties?.className === "string"
              ? String(node.properties.className).split(/\s+/)
              : []
        );
        const extras = Array.from(occRootTokens).filter(
          (t) => !baseClasses.includes(t)
        );
        if (extras.length) propsObj.className = extras.join(" ");

        // Attach properties to hast node for later JSX generation
        parent.children[index] = {
          type: "element",
          tagName: componentTagName,
          properties: propsObj,
          children: [],
        } as any;
      }

      // Stats and logs
      stats.blocks.unique += 1;
      stats.blocks.total += viable.length;
      // eslint-disable-next-line no-console
      console.log(
        `[near-dup] ${componentName}: occurrences=${viable.length}, props=${paramPoints
          .map((p) => p.propName)
          .join(",")}`
      );

      // Mark parents to avoid overlapping replacements
      for (const { parent, node } of viable) {
        replaced.add(node);
        replacedParents.add(parent);
      }
    }

    return tree;
  };
}
