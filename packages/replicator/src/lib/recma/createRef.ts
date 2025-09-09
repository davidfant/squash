import type { Metadata } from "@/types";
import type { Expression, ExpressionStatement, NodeMap } from "estree";
import type { Element, ElementContent, Root } from "hast";
import { h } from "hastscript";
import recmaJsx from "recma-jsx";
import recmaStringify from "recma-stringify";
import rehypeRecma from "rehype-recma";
import { unified } from "unified";
import { SKIP, visit } from "unist-util-visit";
import type { ComponentRegistryItem } from "../componentRegistry";
import { rehypeStripSquashAttribute } from "../rehype/stripSquashAttribute";
import { buildAncestorsMap, nodesMap } from "../traversal/util";
import { recmaFixProperties } from "./fixProperties";
import { recmaRemoveRedundantFragment } from "./removeRedundantFragment";

type CodeId = Metadata.ReactFiber.CodeId;
type ComponentId = Metadata.ReactFiber.ComponentId;

const clone = <T>(c: T): T => JSON.parse(JSON.stringify(c));

export interface CreateRefContext {
  deps: Set<ComponentId>;
  metadata: Metadata.ReactFiber;
  tree: Root;
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
      case "react.component": {
        const el = value as Metadata.ReactFiber.PropValue.Component;
        if (el.nodeId) {
          const elements: Element[] = [];
          const ancestorsMap = buildAncestorsMap(nodesMap(ctx.metadata.nodes));

          visit(ctx.tree, "element", (element, index, parent) => {
            if (index === undefined) return;
            const nodeId = element.properties?.[
              "dataSquashNodeId"
            ] as Metadata.ReactFiber.NodeId;
            if (parent?.type !== "element" && parent?.type !== "root") return;

            if (ancestorsMap.get(nodeId)?.has(el.nodeId!)) {
              elements.push(element);
              return SKIP;
            }
          });

          const processor = unified()
            .use(rehypeStripSquashAttribute)
            .use(rehypeRecma)
            .use(recmaJsx)
            .use(recmaRemoveRedundantFragment)
            // .use(recmaReplaceRefs, opts.componentRegistry)
            .use(recmaFixProperties)
            .use(recmaStringify);

          // TODO: make async?
          const estree = processor.runSync({
            type: "root",
            children: clone(elements),
          });
          const e = (estree.body[0] as ExpressionStatement).expression;
          const maybeExpressionContainer =
            e as unknown as NodeMap["JSXExpressionContainer"];
          if (maybeExpressionContainer.type === "JSXExpressionContainer") {
            return maybeExpressionContainer.expression as Expression;
          } else {
            return e;
          }
        }

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
        const el = value as Metadata.ReactFiber.PropValue.Tag;
        return createComponentElement(
          { id: undefined, name: el.tagName },
          value.props,
          ctx
        );
      }
      case "react.fragment": {
        const f = value as Metadata.ReactFiber.PropValue.Fragment;
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
      case "function": {
        const fn = value as Metadata.ReactFiber.PropValue.Function;
        const componentId = ctx.codeIdToComponentId.get(fn.codeId!);
        const component = ctx.componentRegistry.get(componentId!);
        if (component) {
          ctx.deps.add(component.id);
          return { type: "Identifier", name: component.name.value };
        }
        // TODO: consider prettifying the function
        return { type: "Literal", value: `[Function: ${fn.fn}]` };
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
  const exp = unified()
    .use(recmaJsx)
    .use(recmaStringify)
    .stringify({
      type: "Program",
      sourceType: "module",
      body: [{ type: "ExpressionStatement", expression: element }],
    });

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
