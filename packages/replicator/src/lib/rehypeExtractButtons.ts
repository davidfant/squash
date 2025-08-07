import prettier from "@prettier/sync";
import crypto from "crypto";
import type { Root } from "hast";
import fs from "node:fs/promises";
import path from "path";
import { visit } from "unist-util-visit";

type HastNode = any;

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

export function rehypeExtractButtons(templatePath: string) {
  const outDir = path.join(templatePath, "src/components/ui/buttons");

  return () => async (tree: Root) => {
    await fs.mkdir(outDir, { recursive: true });

    const cache = new Map<string, { componentName: string; tagName: string }>();

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
        let record = cache.get(sig);
        if (!record) {
          const hash = computeHash(sig);
          const componentName = `Button_${hash}`;
          record = { componentName, tagName: tag };
          cache.set(sig, record);
        }

        const { componentName } = record;
        const componentRelBase = path.join(
          "src/components/ui/buttons",
          componentName
        );
        const componentTagName = `Components$${componentRelBase.replaceAll(path.sep, "$")}`;

        // Replace node with component tag, preserving all original props except class/className
        const newProps: Record<string, any> = { ...props };
        delete (newProps as any).className;
        delete (newProps as any).class;

        parent.children[index] = {
          type: "element",
          tagName: componentTagName,
          properties: newProps,
          children: node.children || [],
        } as any;
      }
    );

    // Write components after traversal to avoid duplicate writes per signature
    for (const [sig, { componentName, tagName }] of cache.entries()) {
      const baseClasses = sig.split("|")[1] || "";
      const filePath = path.join(outDir, `${componentName}.jsx`);
      try {
        await fs.access(filePath);
      } catch {
        const code = createComponentCode(componentName, tagName, baseClasses);
        await fs.writeFile(filePath, code, "utf8");
      }
    }

    return tree;
  };
}
