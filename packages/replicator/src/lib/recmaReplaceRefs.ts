import * as acorn from "acorn";
import acornJsx from "acorn-jsx";
import { SKIP, visit } from "estree-util-visit";
import type { Literal } from "hast";
import path from "path";
import type { Plugin } from "unified";

type Program = any;
type ImportDeclaration = any;
type ExportDefaultDeclaration = any;
type ExportNamedDeclaration = any;
type ArrowFunctionExpression = any;

export interface ExtractJSXComponentsOptions {
  componentName?: string; // Required for named exports, default: "Component"
}

const JSXParser = acorn.Parser.extend(acornJsx());
function parseJSX(code: string) {
  const ast = JSXParser.parse(code, {
    ecmaVersion: "latest",
    sourceType: "module",
  });
  if (ast.body[0]!.type === "ExpressionStatement") {
    return ast.body[0]!.expression;
  } else {
    throw new Error("Expected ExpressionStatement");
  }
}

export const recmaReplaceRefs: Plugin<[]> = () => (tree: Program) => {
  const importMap = new Map<string, { default?: string; named: Set<string> }>();

  visit(tree, (node, key, idx, ancestors) => {
    if (node.type !== "JSXElement") return;

    const opening = node.openingElement;
    if (opening.name.type !== "JSXIdentifier" || opening.name.name !== "ref") {
      return;
    }

    //------------------------------------------------------------------
    // 1️⃣  pull attributes we care about
    //------------------------------------------------------------------
    const importAttr = opening.attributes.find(
      (a: any) => a.type === "JSXAttribute" && a.name.name === "imports"
    );
    const jsxAttr = opening.attributes.find(
      (a: any) => a.type === "JSXAttribute" && a.name.name === "jsx"
    );

    if (
      importAttr?.type !== "JSXAttribute" ||
      jsxAttr?.type !== "JSXAttribute"
    ) {
      throw new Error("<ref> is missing required attributes");
    }

    //------------------------------------------------------------------
    // 2️⃣  parse + register imports
    //------------------------------------------------------------------
    const importsJSON = (importAttr.value as Literal).value;
    const imports: Array<{ module: string; import: string[] }> =
      JSON.parse(importsJSON);

    for (const { module, import: specifiers } of imports) {
      const record = importMap.get(module) ?? { named: new Set<string>() };
      for (const spec of specifiers) {
        if (spec === "default") {
          // infer a local name (Svg1, Button etc.)
          record.default ||= path.basename(module);
        } else {
          record.named.add(spec);
        }
      }
      importMap.set(module, record);
    }

    //------------------------------------------------------------------
    // 3️⃣  replace the <ref> element with real JSX (parsed)
    //------------------------------------------------------------------
    const jsxCode = (jsxAttr.value as Literal).value;
    const replacement = parseJSX(jsxCode);

    const parent = ancestors.at(-1)!;
    if (typeof idx === "number") {
      // @ts-ignore
      parent[key!][idx] = replacement;
    } else {
      // @ts-ignore
      parent[key!] = replacement;
    }

    // Don’t walk into the brand-new subtree
    return SKIP;
  });

  const importDecls: ImportDeclaration[] = [];
  for (const [module, { default: def, named }] of importMap) {
    const specifiers: ImportDeclaration["specifiers"] = [];

    if (def) {
      specifiers.push({
        type: "ImportDefaultSpecifier",
        local: { type: "Identifier", name: def },
      } as any);
    }
    for (const n of named) {
      specifiers.push({
        type: "ImportSpecifier",
        imported: { type: "Identifier", name: n },
        local: { type: "Identifier", name: n },
      } as any);
    }

    importDecls.push({
      type: "ImportDeclaration",
      source: { type: "Literal", value: module, raw: `'${module}'` },
      specifiers,
    });
  }

  const originalExpr = (tree.body[0] as any).expression as Element;

  const fn: ArrowFunctionExpression = {
    type: "ArrowFunctionExpression",
    params: [],
    body: originalExpr,
    async: false,
    expression: true,
    generator: false,
    id: null,
  };

  const exportDecl: ExportDefaultDeclaration = {
    type: "ExportDefaultDeclaration",
    declaration: fn,
  };

  tree.body = [...importDecls, exportDecl];
};
