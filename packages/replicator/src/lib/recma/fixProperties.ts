import { visit } from "estree-util-visit";
import type { Plugin } from "unified";

export const recmaFixProperties: Plugin<[]> = () => (tree: any) => {
  visit(tree, (node: any) => {
    if (node.type === "JSXAttribute" && node.name?.name === "tabIndex") {
      const v = node.value;
      if (!v) return;

      if (
        v.type === "Literal" &&
        typeof v.value === "string" &&
        /^-?\d+$/.test(v.value)
      ) {
        const num = Number(v.value);
        node.value = {
          type: "JSXExpressionContainer",
          expression: { type: "Literal", value: num, raw: String(num) },
        };
      }
    }
  });
};
