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

function isButtonCandidate(node: HastNode): boolean {
  if (!node || node.type !== "element") return false;
  const tag = node.tagName;
  const props = node.properties || {};
  if (tag === "button") return true;
  if (tag === "input") {
    const t = (props.type || "").toString().toLowerCase();
    return t === "button" || t === "submit" || t === "reset";
  }
  if (props.role === "button") return true;
  if (tag === "a" && props.role === "button") return true;
  return false;
}

// Signature based on tag kind, attribute keys (not values), child structure, and text presence
function buildButtonShapeSignature(node: HastNode): string {
  const clone = deepClone(node);
  const normalize = (n: HastNode) => {
    if (n.type === "element") {
      // Collapse attributes to presence-only, keep tag
      const props = (n.properties ||= {});
      const keys = Object.keys(props)
        .filter((k) => k !== "class" && k !== "className")
        .sort();
      const presence: Record<string, true> = {};
      for (const k of keys) presence[k] = true;
      // Only record that class exists, not tokens
      if (props.className || props.class) presence.className = true;
      n.properties = presence;
    } else if (n.type === "text") {
      // Replace with token so text existence is captured
      n.value = "__TEXT__";
    }
    (n.children || []).forEach(normalize);
  };
  normalize(clone);
  const html = toHtml(clone);
  return prettier.format(html, { parser: "html" });
}

function flattenPreorder(node: HastNode, out: HastNode[] = []): HastNode[] {
  out.push(node);
  for (const c of node.children || []) flattenPreorder(c, out);
  return out;
}

function isParamAttr(key: string): boolean {
  return (
    key === "href" ||
    key === "target" ||
    key === "rel" ||
    key === "type" ||
    key === "disabled" ||
    key === "title" ||
    key === "name" ||
    key === "value" ||
    key.startsWith("aria-") ||
    key.startsWith("data-")
  );
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

export function rehypeExtractButtons(
  templatePath: string,
  stats: Stats
): Plugin<[], Root> {
  const uiDir = path.join(templatePath, "src/components/ui/buttons");

  return () => async (tree: Root) => {
    await fs.mkdir(uiDir, { recursive: true });

    const table = new Map<string, Occurrence[]>();

    visit(
      tree,
      "element",
      (
        node: HastNode,
        index: number | undefined,
        parent: HastNode | undefined
      ) => {
        if (!parent || index == null) return;
        if (!isButtonCandidate(node)) return;
        const sig = buildButtonShapeSignature(node);
        const occs = table.get(sig) || [];
        occs.push({ parent, index, node });
        table.set(sig, occs);
      }
    );

    const MIN_OCCURRENCES = 2;
    const candidates = Array.from(table.entries()).filter(
      ([, occs]) => occs.length >= MIN_OCCURRENCES
    );

    for (const [shapeSig, occs] of candidates) {
      // Compute base class intersection at root to avoid duplicating tokens
      const rootClassSets = occs.map(
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

      // Determine parameterization points: differing safe attributes and differing text nodes
      const flatLists = occs.map((o) => flattenPreorder(o.node));
      const ref = flatLists[0]!;
      const paramPoints: Array<{
        atIndex: number;
        kind: "attr" | "text";
        attrName?: string;
        propName: string;
      }> = [];
      const usedNames = new Set<string>();
      const makeName = (base: string) => {
        let n = base;
        let i = 1;
        while (usedNames.has(n)) n = `${base}${i++}`;
        usedNames.add(n);
        return n;
      };

      for (let i = 0; i < ref.length; i++) {
        const n0 = ref[i]!;
        if (n0.type === "element") {
          const props0 = n0.properties || {};
          for (const key of Object.keys(props0)) {
            if (!isParamAttr(key)) continue;
            const values = flatLists
              .map((l) => l[i]?.properties?.[key])
              .map((v) => (Array.isArray(v) ? v.join(" ") : (v ?? "")));
            const uniq = new Set(values.map((v) => String(v)));
            if (uniq.size > 1) {
              const base = key
                .replace(/^data-/, "data")
                .replace(/-([a-z])/g, (_, c) => c.toUpperCase());
              const propName = makeName(base);
              paramPoints.push({
                atIndex: i,
                kind: "attr",
                attrName: key,
                propName,
              });
            }
          }
        } else if (n0.type === "text") {
          const values = flatLists.map((l) => String(l[i]?.value || "").trim());
          const uniq = new Set(values);
          if (uniq.size > 1) {
            const propName = makeName("text");
            paramPoints.push({ atIndex: i, kind: "text", propName });
          }
        }
      }

      // Build representative component node with placeholders
      const compNode = deepClone(occs[0]!.node);
      const flatComp = flattenPreorder(compNode);
      for (const p of paramPoints) {
        const target = flatComp[p.atIndex]!;
        if (p.kind === "attr") {
          target.properties ||= {};
          target.properties[p.attrName!] = `__PROP_${p.propName}__`;
        } else {
          target.value = `__PROP_${p.propName}__`;
        }
      }
      // Normalize root classes to intersection
      if (baseClasses.length > 0 && compNode.type === "element") {
        compNode.properties ||= {};
        compNode.properties.className = baseClasses;
      }

      // Generate component code
      const hash = crypto
        .createHash("sha256")
        .update(shapeSig + JSON.stringify(paramPoints.map((p) => p.propName)))
        .digest("hex")
        .slice(0, 8);
      const componentName = `Button_${hash}`;
      const componentPath = path.join(uiDir, `${componentName}.jsx`);
      const componentTagName = `Components$${path
        .relative(templatePath, path.join(uiDir, componentName))
        .replaceAll(path.sep, "$")}`;

      const moduleRoot = { type: "root", children: [compNode] };
      let moduleCode = await hastToStaticModule(moduleRoot);

      // Replace placeholders with JSX expressions
      for (const p of paramPoints) {
        const token = `__PROP_${p.propName}__`;
        moduleCode = moduleCode.replace(
          new RegExp(`\\{\\s*(["'])${token}\\1\\s*\\}`, "g"),
          `{${p.propName}}`
        );
        moduleCode = moduleCode.replace(
          new RegExp(`(["'])${token}\\1`, "g"),
          `{${p.propName}}`
        );
        moduleCode = moduleCode.replace(
          new RegExp(token, "g"),
          `{${p.propName}}`
        );
      }
      moduleCode = moduleCode.replace(
        /\{\s*\{\s*([a-zA-Z_$][\w$]*)\s*\}\s*\}/g,
        `{$1}`
      );

      // Merge className on root element to avoid duplicates
      const base = baseClasses.join(" ");
      moduleCode = moduleCode.replace(
        /<([A-Za-z][^\s/>]*)([^>]*)>/,
        (full, tag, attrs) => {
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

      // Ensure function signature includes provided props and className default
      const propList = [...paramPoints.map((p) => p.propName), "className"];
      const uniqueProps = Array.from(new Set(propList));
      const paramSig = uniqueProps
        .map((p) => (p === "className" ? `${p} = ""` : p))
        .join(", ");
      moduleCode = moduleCode.replace(
        /export default \(\) =>/,
        `export default ({ ${paramSig} } = {}) =>`
      );

      // Write the component
      await fs.writeFile(componentPath, moduleCode, "utf8");

      // Replace occurrences with component usage, passing per-instance props
      for (const { parent, index, node } of occs) {
        const flat = flattenPreorder(node);
        const propsObj: Record<string, any> = {};
        for (const p of paramPoints) {
          if (p.kind === "attr") {
            const value = flat[p.atIndex]?.properties?.[p.attrName!];
            propsObj[p.propName] = Array.isArray(value)
              ? value.join(" ")
              : (value ?? "");
          } else {
            const value = flat[p.atIndex]?.value ?? "";
            propsObj[p.propName] = String(value).trim();
          }
        }
        // className extras = occurrence root classes minus base
        const occTokens = new Set<string>(
          Array.isArray(node.properties?.className)
            ? (node.properties.className as string[])
            : typeof node.properties?.className === "string"
              ? String(node.properties.className).split(/\s+/)
              : []
        );
        const extras = Array.from(occTokens).filter(
          (t) => !baseClasses.includes(t)
        );
        if (extras.length) propsObj.className = extras.join(" ");

        parent.children[index] = {
          type: "element",
          tagName: componentTagName,
          properties: propsObj,
          children: [],
        } as any;
      }

      stats.blocks.unique += 1;
      stats.blocks.total += occs.length;
      // eslint-disable-next-line no-console
      console.log(
        `[buttons] ${componentName}: occurrences=${occs.length}, props=${paramPoints.map((p) => p.propName).join(",")}`
      );
    }

    return tree;
  };
}
