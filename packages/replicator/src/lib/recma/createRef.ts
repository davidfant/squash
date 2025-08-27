import type { Metadata, RefImport } from "@/types";
import type { Expression, NodeMap } from "estree";
import type { ElementContent } from "hast";
import { h } from "hastscript";
import recmaJsx from "recma-jsx";
import recmaStringify from "recma-stringify";
import { unified } from "unified";
import { addImport } from "./replaceRefs";

interface Context {
  codeIdToComponentImport: Map<string, RefImport>;
}

function wrapInJSX(exp: Expression): NodeMap["JSXElement"]["children"][number] {
  if (exp.type === "JSXElement" || exp.type === "JSXFragment") {
    return exp;
  } else {
    return { type: "JSXExpressionContainer", expression: exp };
  }
}

function toExpression(
  value: any,
  imports: RefImport[],
  ctx: Context
): Expression {
  if (Array.isArray(value)) {
    const replaced: Expression[] = [];
    for (const v of value) {
      const r = toExpression(v, imports, ctx);
      replaced.push(r);
    }
    return { type: "ArrayExpression", elements: replaced };
  } else if (typeof value === "object" && value !== null) {
    switch (value.$$typeof) {
      case "react.code": {
        const el = value as Metadata.ReactFiber.Element.Code;
        return createComponentElement(
          ctx.codeIdToComponentImport.get(el.codeId!) ?? {
            module: undefined,
            name: "unknown",
          },
          el.props,
          imports,
          ctx
        );
      }
      case "react.tag": {
        const el = value as Metadata.ReactFiber.Element.Tag;
        return createComponentElement(
          { module: undefined, name: el.tagName },
          value.props,
          imports,
          ctx
        );
      }
      case "react.fragment": {
        const f = value as Metadata.ReactFiber.Element.Fragment;
        const children = f.children
          .map((c) => toExpression(c, imports, ctx))
          .map(wrapInJSX);
        return {
          type: "JSXFragment",
          openingFragment: {
            type: "JSXOpeningFragment",
            // selfClosing: false,
          },
          children,
          closingFragment: { type: "JSXClosingFragment" },
        };
      }
    }

    return {
      type: "ObjectExpression",
      properties: Object.entries(value).map(([k, v]) => ({
        type: "Property",
        // Note(fant): prettier will later unwrap the key if it's possible
        // key: { type: "Identifier", name: k },
        key: { type: "Literal", value: k },
        value: toExpression(v, imports, ctx),
        kind: "init",
        computed: false,
        shorthand: false,
        method: false,
      })),
    };
  }

  return { type: "Literal", value };
}

const buildAttributes = (
  props: Record<string, unknown>,
  imports: RefImport[],
  ctx: Context
): NodeMap["JSXAttribute"][] =>
  Object.entries(props).map(([k, v]): NodeMap["JSXAttribute"] => {
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
    const replaced = toExpression(v, imports, ctx);
    return {
      type: "JSXAttribute",
      name: { type: "JSXIdentifier", name: k },
      value: { type: "JSXExpressionContainer", expression: replaced },
    };
  });

function createComponentElement(
  component: { module?: string; name: string },
  props: Record<string, unknown>,
  imports: RefImport[],
  ctx: Context
): NodeMap["JSXElement"] {
  if (component.module) {
    addImport({ module: component.module, name: component.name }, imports);
  }

  const { children, ...rest } = props;
  const childNodes: NodeMap["JSXElement"]["children"] = [children]
    .flat(Infinity)
    .filter((c) => !!c)
    .map((child) => toExpression(child, imports, ctx))
    .map(wrapInJSX);

  return {
    type: "JSXElement",
    openingElement: {
      type: "JSXOpeningElement",
      name: { type: "JSXIdentifier", name: component.name },
      attributes: buildAttributes(rest, imports, ctx),
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
}

export function createRef({
  nodeId,
  component,
  props,
  children,
  ctx,
}: {
  nodeId: string;
  component: RefImport;
  props: Record<string, unknown>;
  children: ElementContent[];
  ctx: Context;
}) {
  const imports: RefImport[] = [];
  const element = createComponentElement(component, props, imports, ctx);
  return h(
    "ref",
    {
      dataSquashNodeId: nodeId,
      imports: JSON.stringify(imports),
      jsx: unified()
        .use(recmaJsx)
        .use(recmaStringify)
        .stringify({
          type: "Program",
          sourceType: "module",
          body: [{ type: "ExpressionStatement", expression: element }],
        }),
    },
    ...children
  );
}
