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
          n.expression?.type === "JSXFragment"
      );

    const jsx: Expression | undefined = jsxStmt?.expression;
    if (!jsx) throw new Error("No top-level JSX found after HAST → ESTree.");

    program.body = [
      {
        type: "ExportNamedDeclaration",
        declaration: {
          type: "FunctionDeclaration",
          id: { type: "Identifier", name: componentName },
          params: [{ type: "Identifier", name: "props" }],
          generator: false,
          async: false,
          body: {
            type: "BlockStatement",
            body: [{ type: "ReturnStatement", argument: jsx }],
          },
        },
        attributes: [],
        specifiers: [],
        source: null,
      },
    ];
    return program;
  };
