import type { Metadata } from "@/types";
import type { Expression, NodeMap } from "estree";
import type { ElementContent } from "hast";
import { h } from "hastscript";
import recmaJsx from "recma-jsx";
import recmaStringify from "recma-stringify";
import { unified } from "unified";
import type { ComponentRegistryItem } from "../componentRegistry";

type CodeId = Metadata.ReactFiber.CodeId;
type ComponentId = Metadata.ReactFiber.ComponentId;

export interface CreateRefContext {
  deps: Set<ComponentId>;
  codeIdToComponentId: Map<CodeId, ComponentId>;
  componentRegistry: Map<ComponentId, ComponentRegistryItem>;
}

function wrapInJSX(exp: Expression): NodeMap["JSXElement"]["children"][number] {
  if (exp.type === "JSXElement" || exp.type === "JSXFragment") {
    return exp;
  } else {
    return { type: "JSXExpressionContainer", expression: exp };
  }
}

function toExpression(value: any, ctx: CreateRefContext): Expression {
  if (Array.isArray(value)) {
    const replaced: Expression[] = [];
    for (const v of value) {
      const r = toExpression(v, ctx);
      replaced.push(r);
    }
    return { type: "ArrayExpression", elements: replaced };
  } else if (typeof value === "object" && value !== null) {
    switch (value.$$typeof) {
      case "react.code": {
        const el = value as Metadata.ReactFiber.Element.Code;
        const componentId = ctx.codeIdToComponentId.get(el.codeId!);
        const component = ctx.componentRegistry.get(componentId!);
        return createComponentElement(
          component
            ? { id: component.id, name: component.name.value }
            : { id: undefined, name: "unknown" },
          el.props,
          ctx
        );
      }
      case "react.tag": {
        const el = value as Metadata.ReactFiber.Element.Tag;
        return createComponentElement(
          { id: undefined, name: el.tagName },
          value.props,
          ctx
        );
      }
      case "react.fragment": {
        const f = value as Metadata.ReactFiber.Element.Fragment;
        const children = f.children
          .map((c) => toExpression(c, ctx))
          .map(wrapInJSX);
        return {
          type: "JSXFragment",
          openingFragment: { type: "JSXOpeningFragment" },
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
        value: toExpression(v, ctx),
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
  ctx: CreateRefContext
): NodeMap["JSXAttribute"][] =>
  Object.entries(props).map(([k, v]): NodeMap["JSXAttribute"] => {
    if (v === true) {
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
    const replaced = toExpression(v, ctx);
    return {
      type: "JSXAttribute",
      name: { type: "JSXIdentifier", name: k },
      value: { type: "JSXExpressionContainer", expression: replaced },
    };
  });

function createComponentElement(
  comp: { id: ComponentId | undefined; name: string },
  props: Record<string, unknown>,
  ctx: CreateRefContext
): NodeMap["JSXElement"] {
  if (comp.id) ctx.deps.add(comp.id);

  const { children, ...rest } = props;
  const childNodes: NodeMap["JSXElement"]["children"] = [children]
    .flat(Infinity)
    .filter((c) => !!c)
    .map((child) => toExpression(child, ctx))
    .map(wrapInJSX);

  return {
    type: "JSXElement",
    openingElement: {
      type: "JSXOpeningElement",
      name: { type: "JSXIdentifier", name: comp.name },
      attributes: buildAttributes(rest, ctx),
      selfClosing: childNodes.length === 0,
    },
    closingElement:
      childNodes.length === 0
        ? null
        : {
            type: "JSXClosingElement",
            name: { type: "JSXIdentifier", name: comp.name },
          },
    children: childNodes,
  };
}

export function createRef({
  nodeId,
  componentId,
  props,
  children,
  ctx,
}: {
  nodeId?: string;
  componentId: ComponentId;
  props: Record<string, unknown>;
  children: ElementContent[];
  ctx: CreateRefContext;
}) {
  const comp = ctx.componentRegistry.get(componentId);
  if (!comp) {
    throw new Error(`Component ${componentId} not found in registry`);
  }
  const element = createComponentElement(
    { id: comp.id, name: comp.name.value },
    props,
    ctx
  );
  return h(
    "ref",
    {
      dataSquashNodeId: nodeId,
      deps: JSON.stringify([...ctx.deps]),
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
