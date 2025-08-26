import type { RefImport } from "@/types";
import type { NodeMap } from "estree";
import { h } from "hastscript";
import recmaJsx from "recma-jsx";
import recmaStringify from "recma-stringify";
import { unified } from "unified";
import { addImport } from "./replaceRefs";

// TODO: based on props we might need to add more imports!!!
function replaceReactElements(value: any): {
  imports: RefImport[];
  value: any;
  element: boolean;
} {
  const imports: RefImport[] = [];
  if (Array.isArray(value)) {
    const replaced: any[] = [];
    for (const v of value) {
      const r = replaceReactElements(v);
      r.imports.forEach((i) => addImport(i, imports));
      replaced.push(r.value);
    }
    return { imports, value: replaced, element: false };
  } else if (typeof value === "object" && value !== null) {
    switch (value.$$typeof) {
      case "react.code":
      case "react.tag": {
        const { children, ...rest } = value.props;
        const built = buildAttributes(rest);
        built.imports.forEach((i) => addImport(i, imports));

        // TODO: look up component by codeId
        const el = createComponentElement(
          value.$$typeof === "react.code"
            ? value.codeId
              ? { module: `@/components/${value.codeId}`, name: value.codeId }
              : { module: undefined, name: "unknown" }
            : { module: undefined, name: value.tagName },
          value.props
        );
        return { imports: el.imports, value: el.element, element: true };
      }
    }

    const replaced: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      const r = replaceReactElements(v);
      r.imports.forEach((i) => addImport(i, imports));
      replaced[k] = r.value;
    }

    return { imports, value: replaced, element: false };
  }

  return { imports: [], value, element: false };
}

function buildAttributes(props: Record<string, unknown>): {
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
      const replaced = replaceReactElements(v);
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
  props: Record<string, unknown>
): { imports: RefImport[]; element: NodeMap["JSXElement"] } {
  const imports: RefImport[] = component.module
    ? [{ module: component.module, name: component.name }]
    : [];

  const { children, ...rest } = props;
  const childNodes: NodeMap["JSXElement"]["children"] = [];
  (Array.isArray(children) ? children : !!children ? [children] : []).map(
    (child) => {
      if (typeof child === "string") {
        childNodes.push({ type: "JSXText", value: child, raw: child });
      } else {
        const replaced = replaceReactElements(child);
        replaced.imports.forEach((i) => addImport(i, imports));
        childNodes.push(replaced.value);
      }
    }
  );

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
          const replaced = replaceReactElements(value);
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
}: {
  nodeId: string;
  component: RefImport;
  props: Record<string, unknown>;
}) {
  const created = createComponentElement(component, props);
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
