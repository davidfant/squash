import type { RefImport } from "@/types";
import * as acorn from "acorn";
import acornJsx from "acorn-jsx";
import type { ImportDeclaration, NodeMap, Program } from "estree";
import { SKIP, visit } from "estree-util-visit";
import type { Plugin } from "unified";

const JSXParser = acorn.Parser.extend(acornJsx());
function parseJSX(code: string) {
  const ast = JSXParser.parse(code, {
    ecmaVersion: "latest",
    sourceType: "module",
  });
  if (ast.body[0]!.type === "ExpressionStatement") {
    return ast.body[0]!.expression;
  } else {
    console.error(code);
    console.error(ast.body[0]);
    throw new Error("Expected ExpressionStatement");
  }
}

export const recmaReplaceRefs: Plugin<[], Program> = () => (tree: Program) => {
  const imports = new Map<string, RefImport[]>();

  const addImport = (i: RefImport) => {
    const existing = imports.get(i.module) ?? [];
    const exists = existing.some(
      (i) => i.name === i.name && !!i.default === !!i.default
    );
    if (!exists) existing.push(i);
    imports.set(i.module, existing);
  };

  const findAttr = <T>(element: NodeMap["JSXElement"], name: string) => {
    const attr = element.openingElement.attributes.find(
      (a): a is NodeMap["JSXAttribute"] =>
        a.type === "JSXAttribute" && a.name.name === name
    );
    if (attr?.value?.type !== "Literal") return;
    return attr.value.value as T;
  };

  visit(tree, (node, key, idx, ancestors) => {
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
      const importsString = findAttr<string>(node, "imports");
      const jsxString = findAttr<string>(node, "jsx");
      if (!!importsString) {
        const refImports = JSON.parse(importsString) as RefImport[];
        for (const imp of refImports) {
          addImport(imp);
        }
      }

      if (!!jsxString) {
        const jsx = parseJSX(jsxString);
        const parent = ancestors.at(-1)!;
        if (typeof idx === "number") {
          // @ts-ignore
          parent[key!][idx] = jsx;
        } else {
          // @ts-ignore
          parent[key!] = jsx;
        }

        // Don’t walk into the brand-new subtree
        return SKIP;
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
