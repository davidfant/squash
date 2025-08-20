import * as prettier from "@/lib/prettier";
import type { FileSink } from "@/lib/sinks/base";
import crypto from "crypto";
import type { Root } from "hast";
import path from "path";
import { visit } from "unist-util-visit";
import type { HastNode } from "../../hastNode";
import { nameComponents, type ComponentSignature } from "../../nameComponents";
import { createRefFromComponent } from "../createRef";

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

async function createComponentCode(
  componentName: string,
  tagName: string,
  baseClasses: string
) {
  return prettier.ts(`
export default function ${componentName}({ className = "", children, ...props }) {
  return (
    <${tagName} {...props} className={[${JSON.stringify(baseClasses)}, className].filter(Boolean).join(" ")}>{children}</${tagName}>
  );
}
`);
}

export const rehypeExtractButtons =
  (sink: FileSink) => () => async (tree: Root) => {
    const buttonsPath = "components/ui/buttons";

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
      tree,
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
        const isInputTag = tag === "input";
        if (isInputTag) return;

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

    if (signatureToMeta.size === 0) return;

    // Optionally call AI to rename components in batch
    const sortedSigs = Array.from(signatureToMeta.keys()).sort();
    const keys = sortedSigs.map((_, i) => `Button${i + 1}`);

    const named = await nameComponents(
      sortedSigs.map((sig, i): ComponentSignature => {
        const meta = signatureToMeta.get(sig)!;
        const tsx = `<${meta.tagName} className="${meta.baseClasses}">...</${meta.tagName}>`;
        return { id: keys[i]!, tsx };
      })
    );

    // Build mapping sig -> AI name, ensuring sanitized and unique
    const used = new Set<string>();
    const sanitize = (s: string) => {
      let candidate = s;
      let n = 2;
      while (used.has(candidate)) candidate = `${s}${n++}`;
      used.add(candidate);
      return candidate;
    };

    const nameBySig = new Map<string, string>();
    sortedSigs.forEach((sig, i) => {
      const raw = named[keys[i]!]!;
      if (raw) nameBySig.set(sig, sanitize(raw));
    });

    // Second pass: replace nodes with final names
    for (const occ of occurrences) {
      const componentName = nameBySig.get(occ.signature)!;

      // Replace node with component tag, preserving all original props except class/className
      const newProps: Record<string, any> = { ...(occ.node.properties || {}) };
      delete newProps.className;
      delete newProps.class;

      occ.parent.children[occ.index] = createRefFromComponent({
        module: path.join("@", buttonsPath, componentName),
        // props: newProps,
        children: occ.node.children,
      });
    }

    await Promise.all([
      Array.from(signatureToMeta.entries()).map(async ([sig, meta]) => {
        const cName = nameBySig.get(sig)!;
        const filePath = path.join("src", buttonsPath, `${cName}.tsx`);
        const code = await createComponentCode(
          cName,
          meta.tagName,
          meta.baseClasses
        );
        await sink.writeText(filePath, code);
      }),
    ]);
  };
