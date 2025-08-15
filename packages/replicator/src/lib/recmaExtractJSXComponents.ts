import { visit } from "estree-util-visit";
import type { Plugin } from "unified";

type Program = any;
type ImportDeclaration = any;
type ExportDefaultDeclaration = any;
type ExportNamedDeclaration = any;
type ArrowFunctionExpression = any;

export interface ExtractJSXComponentsOptions {
  componentName?: string; // Required for named exports, default: "Component"
}

export const recmaExtractJSXComponents: Plugin<
  [ExtractJSXComponentsOptions?]
> =
  (options: ExtractJSXComponentsOptions = {}) =>
  (tree: Program) => {
    const imports = new Map<string, ImportDeclaration>();

    visit(tree, (node) => {
      if (node.type === "JSXElement") {
        // [node.openingElement, node.closingElement].forEach((el) => {
        //   if (!el) return;
        //   const name = el.name;
        //   if (
        //     name.type === "JSXIdentifier" &&
        //     name.name.startsWith("Components$src$")
        //   ) {
        //     const importPath = name.name
        //       .replaceAll("$", "/")
        //       .replace("Components/src", "@");
        //     const componentName = importPath.split("/").pop()!;
        //     name.name = componentName;
        //     imports.set(componentName, {
        //       type: "ImportDeclaration",
        //       specifiers: [
        //         {
        //           type: "ImportDefaultSpecifier",
        //           local: { type: "Identifier", name: componentName },
        //         },
        //       ],
        //       source: { type: "Literal", value: importPath },
        //     });
        //   }
        // });

        const name = node.openingElement.name;
        if (name.type === "JSXIdentifier" && name.name === "slot") {
          const importAttr = node.openingElement.attributes
            .filter((a) => a.type === "JSXAttribute")
            .find(
              (a) => a.name.type === "JSXIdentifier" && a.name.name === "import"
            );
          if (importAttr?.value?.type !== "Literal") return;
          const importPath = importAttr.value.value;
          if (typeof importPath !== "string") return;

          const importAttrIndex =
            node.openingElement.attributes.indexOf(importAttr);
          node.openingElement.attributes.splice(importAttrIndex);

          const componentName = importPath.split("/").pop()!;
          name.name = componentName;
          if (node.closingElement?.name.type === "JSXIdentifier") {
            node.closingElement.name.name = componentName;
          }

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

    let exportDeclaration: ExportDefaultDeclaration | ExportNamedDeclaration;

    if (options.componentName) {
      exportDeclaration = {
        type: "ExportNamedDeclaration",
        declaration: {
          type: "VariableDeclaration",
          declarations: [
            {
              type: "VariableDeclarator",
              id: { type: "Identifier", name: options.componentName },
              init: fn,
            },
          ],
          kind: "const",
        },
        specifiers: [],
        source: null,
      };
    } else {
      exportDeclaration = {
        type: "ExportDefaultDeclaration",
        declaration: fn,
      };
    }

    tree.body = [...Array.from(imports.values()), exportDeclaration];
  };
