import type { Stats } from "@/types";
import { visit } from "estree-util-visit";
import type { Plugin } from "unified";
type Node = any;
type Program = any;
type ImportDeclaration = any;
type ExportDefaultDeclaration = any;
type ArrowFunctionExpression = any;

// Define JSXMemberExpression type since it's not in standard types
interface JSXMemberExpression extends Node {
  type: "JSXMemberExpression";
  object: JSXMemberExpression | { type: "JSXIdentifier"; name: string };
  property: { type: "JSXIdentifier"; name: string };
}

interface Options {
  importPrefix?: string; // Default: "@"
}

export const recmaExtractJSXComponents =
  (stats: Stats): Plugin<[Options?]> =>
  () => {
    return (tree: Program) => {
      const imports = new Map<string, ImportDeclaration>();
      const uniqueSvgs = new Set<string>();
      const uniqueBlocks = new Set<string>();

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
              if (importPath.includes("/components/svgs/")) {
                stats.svgs.total++;
                uniqueSvgs.add(componentName);
              } else if (importPath.includes("/components/blocks/")) {
                stats.blocks.total++;
                uniqueBlocks.add(componentName);
              }
            }
          });
        }
      });

      stats.svgs.unique += uniqueSvgs.size;
      stats.blocks.unique += uniqueBlocks.size;

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
  };
