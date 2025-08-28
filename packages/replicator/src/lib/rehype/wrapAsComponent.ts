import type { Expression, Program } from "estree";
import type { Plugin } from "unified";

export const recmaWrapAsComponent: Plugin<[componentName: string], Program> =
  (componentName) =>
  (program: Program): Program => {
    const jsxStmt = program.body
      .filter((n) => n.type === "ExpressionStatement")
      .find(
        (n) =>
          n.expression?.type === "JSXElement" ||
          n.expression?.type === "JSXFragment" ||
          // @ts-expect-error
          n.expression?.type === "JSXExpressionContainer"
      );

    const jsx: Expression | undefined = jsxStmt?.expression;
    if (!jsx) throw new Error("No top-level JSX found after HAST → ESTree.");

    const returns =
      // @ts-expect-error
      jsx.type === "JSXExpressionContainer" ? jsx.expression : jsx;
    program.body = [
      {
        type: "ExportNamedDeclaration",
        declaration: {
          type: "FunctionDeclaration",
          id: { type: "Identifier", name: componentName },
          params: [],
          // params: [{ type: "Identifier", name: "props" }],
          generator: false,
          async: false,
          body: {
            type: "BlockStatement",
            body: [{ type: "ReturnStatement", argument: returns }],
          },
        },
        attributes: [],
        specifiers: [],
        source: null,
      },
    ];
    return program;
  };
