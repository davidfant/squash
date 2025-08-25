import * as acorn from "acorn";
import acornJsx from "acorn-jsx";
import { SKIP, visit } from "estree-util-visit";
import type { Literal } from "hast";
import path from "path";
import type { Plugin } from "unified";

type Program = any;
type JSXIdentifier = any;
type JSXAttribute = any;
type JSXExpressionContainer = any;
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
    console.error(code);
    console.error(ast.body[0]);
    throw new Error("Expected ExpressionStatement");
  }
}

const ident = (n: string): JSXIdentifier => ({
  type: "JSXIdentifier",
  name: n,
});

const lit = (v: string): Literal => ({ type: "Literal", value: v });

const expr = (v: unknown): JSXExpressionContainer => ({
  type: "JSXExpressionContainer",
  expression: lit(v as never),
});

const attr = (key: string, value: unknown): JSXAttribute => {
  // <Comp disabled />   -> value === null
  if (typeof value === "boolean" && value === true) {
    return { type: "JSXAttribute", name: ident(key), value: null };
  }

  // <Comp size="sm" />
  if (typeof value === "string") {
    return { type: "JSXAttribute", name: ident(key), value: lit(value) };
  }

  // <Comp count={42} />  or  <Comp data={{…}} />
  return { type: "JSXAttribute", name: ident(key), value: expr(value) };
};

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
    const findAttr = (name: string) =>
      opening.attributes
        .filter((a) => a.type === "JSXAttribute")
        .find((a) => a.name.name === name);

    const importAttr = findAttr("imports");
    const jsxAttr = findAttr("jsx");
    const tagNameAttr = findAttr("tagName");
    const propsAttr = findAttr("props");

    if (importAttr) {
      const imports: Array<{ module: string; import: string[] }> = JSON.parse(
        (importAttr.value as Literal).value
      );

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
    }

    if (jsxAttr) {
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
    } else if (tagNameAttr) {
      const tagName = (tagNameAttr.value as Literal).value;
      const props = propsAttr
        ? JSON.parse((propsAttr.value as Literal).value)
        : {};

      const id = { type: "JSXIdentifier", name: tagName } as const;
      node.openingElement.name = id;
      if (node.closingElement) node.closingElement.name = id;

      node.openingElement.attributes = Object.entries(props)
        .map(([key, value]) => attr(key, value))
        .filter(Boolean);
    }
  });

  const importDecls: ImportDeclaration[] = [];
  for (const [module, { default: def, named }] of importMap) {
    const specifiers: ImportDeclaration["specifiers"] = [];

    if (def) {
      specifiers.push({
        type: "ImportDefaultSpecifier",
        local: { type: "Identifier", name: def },
      });
    }
    for (const n of named) {
      specifiers.push({
        type: "ImportSpecifier",
        imported: { type: "Identifier", name: n },
        local: { type: "Identifier", name: n },
      });
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
