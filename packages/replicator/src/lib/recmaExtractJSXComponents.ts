import type { Stats } from "@/types";
import type {
  ArrowFunctionExpression,
  ExportDefaultDeclaration,
  ImportDeclaration,
  Node,
  Program,
} from "estree";
import { visit } from "estree-util-visit";
import type { Plugin } from "unified";

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
              stats.svgs.total++;
            }
          });
        }
      });

      stats.svgs.unique += imports.size;

      const fn: ArrowFunctionExpression = {
        type: "ArrowFunctionExpression",
        id: null,
        params: [],
        generator: false,
        async: false,
        expression: true,
        body: tree.body[0],
      };

      const decl: ExportDefaultDeclaration = {
        type: "ExportDefaultDeclaration",
        declaration: fn,
      };

      tree.body = [...Array.from(imports.values()), decl];
    };
  };
