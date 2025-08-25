import type { Program } from "estree";

export const componentToRecma = (
  componentName: string,
  props: Record<string, unknown>
): Program => ({
  type: "Program",
  sourceType: "module",
  body: [
    {
      type: "ExpressionStatement",
      expression: {
        type: "JSXElement",
        openingElement: {
          type: "JSXOpeningElement",
          name: { type: "JSXIdentifier", name: componentName },
          attributes: Object.entries(props).map(([k, value]) => ({
            type: "JSXAttribute",
            name: { type: "JSXIdentifier", name: k },
            // if string, make it a literal, otherwise declare a value within propertyName={...}
            value: (() => {
              if (value === true) {
                return null;
              }
              if (typeof value === "string") {
                return { type: "Literal", value };
              }
              return {
                type: "JSXExpressionContainer",
                expression: { type: "Literal", value: value as any },
              };
            })(),
          })),
          selfClosing: true,
        },
        closingElement: null,
        children: [],
      },
    },
  ],
});
