import { config } from "@/config";
import prettier from "@prettier/sync";
import crypto from "crypto";
import type { Root } from "hast";
import fs from "node:fs/promises";
import path from "path";
import { visit } from "unist-util-visit";
import type { HastNode } from "../../hastToStaticModule";
import { nameComponents, type ComponentSignature } from "../../nameComponents";

function toClassTokens(props: Record<string, any> | undefined): string[] {
  if (!props) return [];
  const value = props.className ?? props.class;
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap((v) => String(v).split(/\s+/)).filter(Boolean);
  }
  return String(value).split(/\s+/).filter(Boolean);
}

function tokensSignature(tokens: string[]): string {
  const unique = Array.from(new Set(tokens)).sort();
  return unique.join(" ");
}

function computeHash(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 8);
}

function createComponentCode(
  componentName: string,
  tagName: string,
  baseClasses: string
): string {
  const code = `
export default function ${componentName}({ className = "", children, ...props }) {
  return (
    <${tagName} {...props} className={[${JSON.stringify(baseClasses)}, className].filter(Boolean).join(" ")}> {children} </${tagName}>
  );
}
`;
  return prettier.format(code, { parser: "babel" });
}

export const rehypeExtractButtons =
  (templatePath: string) => () => async (tree: Root) => {
    const outDir = path.join(templatePath, "src/components/ui/buttons");
    await fs.mkdir(outDir, { recursive: true });

    // First pass: collect button-like nodes and signatures
    const occurrences: Array<{
      parent: HastNode;
      index: number;
      node: HastNode;
      tagName: string;
      baseClasses: string;
      signature: string; // tag|classes signature
    }> = [];

    const signatureToMeta = new Map<
      string,
      { tagName: string; baseClasses: string }
    >();

    visit(
      tree as any,
      "element",
      (
        node: HastNode,
        index: number | undefined,
        parent: HastNode | undefined
      ) => {
        if (!parent || index == null) return;
        const tag: string = node.tagName;
        const props: Record<string, any> = node.properties || {};

        // Button-like detection (framework-agnostic)
        const isButtonTag = tag === "button";
        const hasRoleButton = props.role === "button";
        const hasTypeButton = props.type === "button"; // could be input/button
        if (!isButtonTag && !hasRoleButton && !hasTypeButton) return;

        const classTokens = toClassTokens(props);
        if (classTokens.length === 0) return; // nothing to unify

        const baseSig = tokensSignature(classTokens);
        const sig = `${tag}|${baseSig}`;
        signatureToMeta.set(sig, { tagName: tag, baseClasses: baseSig });
        occurrences.push({
          parent: parent as any,
          index: index as number,
          node,
          tagName: tag,
          baseClasses: baseSig,
          signature: sig,
        });
      }
    );

    if (signatureToMeta.size === 0) return tree;

    // Derive default names per signature
    const defaultNameBySig = new Map<string, string>();
    for (const sig of signatureToMeta.keys()) {
      const hash = computeHash(sig);
      defaultNameBySig.set(sig, `Button_${hash}`);
    }

    // Optionally call AI to rename components in batch
    let finalNameBySig = new Map(defaultNameBySig);
    if (config.componentNaming.enabled) {
      const sortedSigs = Array.from(signatureToMeta.keys()).sort();
      const keys = sortedSigs.map((_, i) => `BUTTON${i + 1}`);
      const components: ComponentSignature[] = sortedSigs.map((sig, i) => {
        const meta = signatureToMeta.get(sig)!;
        const jsx = `<${meta.tagName} className="${meta.baseClasses}">...</${meta.tagName}>`;
        return { id: keys[i]!, jsx };
      });

      const named = await nameComponents({
        model: config.componentNaming.model,
        components,
      });

      // Build mapping sig -> AI name, ensuring sanitized and unique
      const used = new Set<string>();
      const sanitize = (s: string) => {
        let candidate = s;
        let n = 2;
        while (used.has(candidate)) candidate = `${s}${n++}`;
        used.add(candidate);
        return candidate;
      };

      sortedSigs.forEach((sig, i) => {
        const raw = named[keys[i]!]!;
        if (raw) finalNameBySig.set(sig, sanitize(raw));
      });
    }

    // Second pass: replace nodes with final names
    for (const occ of occurrences) {
      const componentName = finalNameBySig.get(occ.signature)!;
      const componentRelBase = path.join(
        "src/components/ui/buttons",
        componentName
      );
      const componentTagName = `Components$${componentRelBase.replaceAll(path.sep, "$")}`;

      // Replace node with component tag, preserving all original props except class/className
      const newProps: Record<string, any> = { ...(occ.node.properties || {}) };
      delete newProps.className;
      delete newProps.class;

      occ.parent.children[occ.index] = {
        type: "element",
        tagName: componentTagName,
        properties: newProps,
        children: occ.node.children || [],
      } as any;
    }

    // Write components for each signature
    for (const [sig, meta] of signatureToMeta.entries()) {
      const componentName = finalNameBySig.get(sig)!;
      const filePath = path.join(outDir, `${componentName}.jsx`);
      try {
        await fs.access(filePath);
      } catch {
        const code = createComponentCode(
          componentName,
          meta.tagName,
          meta.baseClasses
        );
        await fs.writeFile(filePath, code, "utf8");
      }
    }

    return tree;
  };
