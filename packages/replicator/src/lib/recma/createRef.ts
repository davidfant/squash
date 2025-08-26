import type { RefImport } from "@/types";
import type { NodeMap } from "estree";
import { h } from "hastscript";
import recmaJsx from "recma-jsx";
import recmaStringify from "recma-stringify";
import { unified } from "unified";
import { addImport } from "./replaceRefs";

interface Context {
  codeIdToComponentImport: Map<string, RefImport>;
}

function replaceReactElements(
  value: any,
  ctx: Context
): {
  imports: RefImport[];
  value: any;
  element: boolean;
} {
  const imports: RefImport[] = [];
  if (Array.isArray(value)) {
    const replaced: any[] = [];
    for (const v of value) {
      const r = replaceReactElements(v, ctx);
      r.imports.forEach((i) => addImport(i, imports));
      replaced.push(r.value);
    }
    return { imports, value: replaced, element: false };
  } else if (typeof value === "object" && value !== null) {
    switch (value.$$typeof) {
      case "react.code":
      case "react.tag": {
        const { children, ...rest } = value.props;
        const built = buildAttributes(rest, ctx);
        built.imports.forEach((i) => addImport(i, imports));

        const el = createComponentElement(
          (() => {
            if (value.$$typeof === "react.tag") {
              return { module: undefined, name: value.tagName };
            }
            const component = ctx.codeIdToComponentImport.get(value.codeId!);
            return component ?? { module: undefined, name: "unknown" };
          })(),
          value.props,
          ctx
        );
        return { imports: el.imports, value: el.element, element: true };
      }
    }

    const replaced: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      const r = replaceReactElements(v, ctx);
      r.imports.forEach((i) => addImport(i, imports));
      replaced[k] = r.value;
    }

    return { imports, value: replaced, element: false };
  }

  return { imports: [], value, element: false };
}

function buildAttributes(
  props: Record<string, unknown>,
  ctx: Context
): {
  imports: RefImport[];
  attributes: NodeMap["JSXAttribute"][];
} {
  const imports: RefImport[] = [];
  const attributes = Object.entries(props).map(
    ([k, v]): NodeMap["JSXAttribute"] => {
      if (v === true) {
        // boolean true → <tag attr />
        return {
          type: "JSXAttribute",
          name: { type: "JSXIdentifier", name: k },
          value: null,
        };
      }
      if (typeof v === "string") {
        return {
          type: "JSXAttribute",
          name: { type: "JSXIdentifier", name: k },
          value: { type: "Literal", value: v },
        };
      }
      // everything else becomes an expression
      const replaced = replaceReactElements(v, ctx);
      replaced.imports.forEach((i) => addImport(i, imports));
      return {
        type: "JSXAttribute",
        name: { type: "JSXIdentifier", name: k },
        value: { type: "JSXExpressionContainer", expression: replaced.value },
      };
    }
  );

  return { attributes, imports };
}

function createComponentElement(
  component: { module?: string; name: string },
  props: Record<string, unknown>,
  ctx: Context
): { imports: RefImport[]; element: NodeMap["JSXElement"] } {
  const imports: RefImport[] = component.module
    ? [{ module: component.module, name: component.name }]
    : [];

  const { children, ...rest } = props;
  const childNodes: NodeMap["JSXElement"]["children"] = [];
  [children]
    .flat(Infinity)
    .filter((c) => !!c)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") {
        childNodes.push({
          type: "JSXExpressionContainer",
          expression: { type: "Literal", value: child },
        });
      } else {
        const replaced = replaceReactElements(child, ctx);
        replaced.imports.forEach((i) => addImport(i, imports));
        childNodes.push(replaced.value);
      }
    });

  const element: NodeMap["JSXElement"] = {
    type: "JSXElement",
    openingElement: {
      type: "JSXOpeningElement",
      name: { type: "JSXIdentifier", name: component.name },
      attributes: Object.entries(rest).map(([k, value]) => ({
        type: "JSXAttribute",
        name: { type: "JSXIdentifier", name: k },
        value: (() => {
          if (value === true) return null;
          if (typeof value === "string") return { type: "Literal", value };
          const replaced = replaceReactElements(value, ctx);
          replaced.imports.forEach((i) => addImport(i, imports));
          return {
            type: "JSXExpressionContainer",
            expression: { type: "Literal", value: replaced.value },
          };
        })(),
      })),
      selfClosing: childNodes.length === 0,
    },
    closingElement:
      childNodes.length === 0
        ? null
        : {
            type: "JSXClosingElement",
            name: { type: "JSXIdentifier", name: component.name },
          },
    children: childNodes,
  };

  return { imports, element: element };
}

export function createRef({
  nodeId,
  component,
  props,
  ctx,
}: {
  nodeId: string;
  component: RefImport;
  props: Record<string, unknown>;
  ctx: Context;
}) {
  const created = createComponentElement(component, props, ctx);
  return h("ref", {
    dataSquashNodeId: nodeId,
    imports: JSON.stringify(created.imports satisfies RefImport[]),
    jsx: unified()
      .use(recmaJsx)
      .use(recmaStringify)
      .stringify({
        type: "Program",
        sourceType: "module",
        body: [{ type: "ExpressionStatement", expression: created.element }],
      }),
  });
}
