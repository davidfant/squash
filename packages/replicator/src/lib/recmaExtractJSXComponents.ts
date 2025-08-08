import { visit } from "estree-util-visit";
import type { Plugin } from "unified";

type Program = any;
type ImportDeclaration = any;
type ExportDefaultDeclaration = any;
type ArrowFunctionExpression = any;

interface Options {
  importPrefix?: string; // Default: "@"
}

export const recmaExtractJSXComponents: Plugin<[Options?]> =
  () => (tree: Program) => {
    const imports = new Map<string, ImportDeclaration>();

    visit(tree, (node) => {
      if (node.type === "JSXElement") {
        [node.openingElement, node.closingElement].forEach((el) => {
          if (!el) return;
          const name = el.name;
          if (
            name.type === "JSXIdentifier" &&
            name.name.startsWith("Components$src$")
          ) {
            const importPath = name.name
              .replaceAll("$", "/")
              .replace("Components/src", "@");
            const componentName = importPath.split("/").pop()!;
            name.name = componentName;
            imports.set(componentName, {
              type: "ImportDeclaration",
              specifiers: [
                {
                  type: "ImportDefaultSpecifier",
                  local: { type: "Identifier", name: componentName },
                },
              ],
              source: { type: "Literal", value: importPath },
            });
          }
        });
      }
    });

    // Determine expression to return; unwrap a single-child JSXFragment
    let returnExpr: any = tree.body[0] as any;
    if (returnExpr && returnExpr.type === "ExpressionStatement") {
      returnExpr = returnExpr.expression;
    }
    if (
      returnExpr &&
      returnExpr.type === "JSXFragment" &&
      Array.isArray(returnExpr.children) &&
      returnExpr.children.length === 1 &&
      returnExpr.children[0] &&
      returnExpr.children[0].type === "JSXElement"
    ) {
      returnExpr = returnExpr.children[0];
    }

    const fn: ArrowFunctionExpression = {
      type: "ArrowFunctionExpression",
      id: null,
      params: [],
      generator: false,
      async: false,
      expression: true,
      body: returnExpr as any,
    };

    const decl: ExportDefaultDeclaration = {
      type: "ExportDefaultDeclaration",
      declaration: fn,
    };

    tree.body = [...Array.from(imports.values()), decl];
  };
