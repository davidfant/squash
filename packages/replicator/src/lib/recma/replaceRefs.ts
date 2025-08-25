import type { RefImport } from "@/types";
import type { ImportDeclaration, NodeMap, Program } from "estree";
import { visit } from "estree-util-visit";
import type { Plugin } from "unified";

export const recmaReplaceRefs: Plugin<[], Program> = () => (tree: Program) => {
  const imports = new Map<string, RefImport[]>();

  const addImport = (i: RefImport) => {
    const existing = imports.get(i.module) ?? [];
    const exists = existing.some(
      (i) => i.name === i.name && !!i.default === i.default
    );
    if (!exists) existing.push(i);
    imports.set(i.module, existing);
  };

  visit(tree, (node) => {
    // existing imports
    if (node.type === "ImportDeclaration") {
      const module = node.source.value as string;
      for (const spec of node.specifiers) {
        if (spec.type === "ImportDefaultSpecifier") {
          addImport({ module, name: spec.local.name, default: true });
        } else if (
          spec.type === "ImportSpecifier" &&
          spec.imported.type === "Identifier"
        ) {
          addImport({ module, name: spec.imported.name });
        }
      }
    }

    // imports from <ref ... />
    if (
      node.type === "JSXElement" &&
      node.openingElement?.name?.type === "JSXIdentifier" &&
      node.openingElement.name.name === "ref"
    ) {
      const importsAttr = node.openingElement.attributes.find(
        (a): a is NodeMap["JSXAttribute"] =>
          a.type === "JSXAttribute" && a.name.name === "imports"
      )?.value;
      if (importsAttr?.type !== "Literal") return;

      const refImports = JSON.parse(importsAttr.value as string) as RefImport[];
      for (const imp of refImports) {
        const existing = imports.get(imp.module) ?? [];
        const exists = existing.some(
          (i) => i.name === imp.name && !!i.default === imp.default
        );
        if (!exists) existing.push(imp);
        imports.set(imp.module, existing);
      }
    }
  });

  const importDecls: ImportDeclaration[] = [];
  for (const [module, moduleImports] of imports) {
    const specifiers: ImportDeclaration["specifiers"] = [];

    for (const i of moduleImports) {
      if (i.default) {
        specifiers.push({
          type: "ImportDefaultSpecifier",
          local: { type: "Identifier", name: i.name },
        });
      } else {
        specifiers.push({
          type: "ImportSpecifier",
          imported: { type: "Identifier", name: i.name },
          local: { type: "Identifier", name: i.name },
        });
      }
    }

    importDecls.push({
      type: "ImportDeclaration",
      source: { type: "Literal", value: module, raw: `'${module}'` },
      specifiers,
      attributes: [],
    });
  }

  tree.body = [...importDecls, ...tree.body];
};
