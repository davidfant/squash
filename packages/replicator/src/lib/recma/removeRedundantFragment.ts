import type { Program } from "estree";
import { visit } from "estree-util-visit";
import type { Plugin } from "unified";

export const recmaRemoveRedundantFragment: Plugin<[], Program> =
  () => (tree: Program) => {
    visit(tree, (node) => {
      if (node.type === "Program" && node.body.length === 1) {
        const body = node.body[0]!;
        if (
          body.type === "ExpressionStatement" &&
          body.expression.type === "JSXFragment" &&
          body.expression.children.filter((c) => c.type !== "JSXText")
            .length === 1
        ) {
          // @ts-expect-error
          body.expression = body.expression.children.find(
            (c) => c.type !== "JSXText"
          );
        }
      }
    });
  };
