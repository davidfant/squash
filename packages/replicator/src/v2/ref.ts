import { recmaFixProperties } from "@/lib/recma/fixProperties";
import { recmaRemoveRedundantFragment } from "@/lib/recma/removeRedundantFragment";
import type { Metadata } from "@/types";
import type {
  Expression,
  ExpressionStatement,
  ImportDeclaration,
  NodeMap,
  Program,
} from "estree";
import { visit as estreeVisit } from "estree-util-visit";
import type { Element } from "hast";
import { h } from "hastscript";
import path from "path";
import recmaJsx from "recma-jsx";
import recmaStringify from "recma-stringify";
import rehypeRecma from "rehype-recma";
import { unified, type Plugin } from "unified";
import { SKIP, visit } from "unist-util-visit";
import type { ReplicatorState } from "./state";

type CodeId = Metadata.ReactFiber.CodeId;
type ComponentId = Metadata.ReactFiber.ComponentId;

const clone = <T>(c: T): T => JSON.parse(JSON.stringify(c));

export interface ReplaceRefsContext {
  imports: Set<ComponentId>;
  state: ReplicatorState;
}

function wrapInJSX(exp: Expression): NodeMap["JSXElement"]["children"][number] {
  if (exp.type === "JSXElement" || exp.type === "JSXFragment") {
    return exp;
  } else {
    return { type: "JSXExpressionContainer", expression: exp };
  }
}

function toExpression(value: any, ctx: ReplaceRefsContext): Expression {
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
        // if (el.nodeId) {
        //   const elements: Element[] = [];
        //   const ancestorsMap = buildAncestorsMap(nodesMap(ctx.metadata.nodes));

        //   visit(ctx.tree, "element", (element, index, parent) => {
        //     if (index === undefined) return;
        //     const nodeId = element.properties?.[
        //       "dataSquashNodeId"
        //     ] as Metadata.ReactFiber.NodeId;
        //     if (parent?.type !== "element" && parent?.type !== "root") return;

        //     if (ancestorsMap.get(nodeId)?.has(el.nodeId!)) {
        //       elements.push(element);
        //       return SKIP;
        //     }
        //   });

        //   const processor = unified()
        //     .use(rehypeStripSquashAttribute)
        //     .use(rehypeRecma)
        //     .use(recmaJsx)
        //     .use(recmaRemoveRedundantFragment)
        //     // .use(recmaReplaceRefs, opts.componentRegistry)
        //     .use(recmaFixProperties)
        //     .use(recmaStringify);

        //   // TODO: make async?
        //   const estree = processor.runSync({
        //     type: "root",
        //     children: clone(elements),
        //   });
        //   const e = (estree.body[0] as ExpressionStatement).expression;
        //   const maybeExpressionContainer =
        //     e as unknown as NodeMap["JSXExpressionContainer"];
        //   if (maybeExpressionContainer.type === "JSXExpressionContainer") {
        //     return maybeExpressionContainer.expression as Expression;
        //   } else {
        //     return e;
        //   }
        // }

        const componentId = ctx.state.component.fromCodeId.get(el.codeId!);
        const component = ctx.state.component.registry.get(componentId!);
        if (component) {
          return createComponentElement(
            component
              ? { id: component.id, name: component.name }
              : { id: undefined, name: "unknown" },
            el.props,
            ctx
          );
        } else if (el.nodeId) {
          // TODO: figure out how to get the right tree..... or can we get all for now?
          for (const tree of ctx.state.node.trees.values()) {
            const elements: Element[] = [];
            visit(tree, "element", (element, index, parent) => {
              if (index === undefined) return;
              const nodeId = element.properties?.[
                "dataSquashNodeId"
              ] as Metadata.ReactFiber.NodeId;
              if (parent?.type !== "element" && parent?.type !== "root") return;
              if (ctx.state.node.ancestors.get(nodeId)?.has(el.nodeId!)) {
                elements.push(element);
                return SKIP;
              }
            });

            if (elements.length) {
              // TODO: store in state...

              // TODO: make async?
              const estree = unified()
                .use(rehypeRecma)
                .use(recmaJsx)
                .use(recmaRemoveRedundantFragment)
                // .use(recmaReplaceRefs, opts.componentRegistry)
                // .use(recmaStripSquashAttribute)
                .use(recmaFixProperties)
                .use(recmaStringify)
                .runSync(clone({ type: "root", children: elements }));

              const e = (estree.body[0] as ExpressionStatement).expression;
              const maybeExpressionContainer =
                e as unknown as NodeMap["JSXExpressionContainer"];
              if (maybeExpressionContainer.type === "JSXExpressionContainer") {
                return maybeExpressionContainer.expression as Expression;
              } else {
                return e;
              }
            }
          }
        }

        throw new Error(
          `Component ${componentId} not found in registry and no nodeId`
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
        const componentId = ctx.state.component.fromCodeId.get(fn.codeId!);
        const component = ctx.state.component.registry.get(componentId!);
        if (component) {
          ctx.imports.add(component.id);
          return { type: "Identifier", name: component.name };
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
  ctx: ReplaceRefsContext
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
  ctx: ReplaceRefsContext
): NodeMap["JSXElement"] {
  if (comp.id) ctx.imports.add(comp.id);

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

export const createRef = ({
  nodeId,
  component,
  props,
}: {
  nodeId?: string;
  component: { id: ComponentId; name: string };
  props: Record<string, unknown>;
}) =>
  h("ref", {
    dataSquashNodeId: nodeId,
    dataSquashComponentId: component.id,
    props: JSON.stringify(props),
  });

const findAttr = <T>(element: NodeMap["JSXElement"], name: string) => {
  const attr = element.openingElement.attributes.find(
    (a): a is NodeMap["JSXAttribute"] =>
      a.type === "JSXAttribute" && a.name.name === name
  );
  if (attr?.value?.type !== "Literal") return;
  return attr.value.value as T;
};

export const recmaReplaceRefs: Plugin<[state: ReplicatorState], Program> =
  (state) => (tree) => {
    const imports = new Set<ComponentId>();

    estreeVisit(tree, (node) => {
      if (
        node.type !== "JSXElement" ||
        node.openingElement.name.type !== "JSXIdentifier" ||
        node.openingElement.name.name !== "ref"
      ) {
        return;
      }

      const compId = findAttr<ComponentId>(node, "data-squash-component-id");
      const propsString = findAttr<string>(node, "props");
      if (!compId || !propsString) return;
      const props = JSON.parse(propsString) as Record<string, unknown>;

      imports.add(compId);
      const compName = state.component.name.get(compId) ?? "Component";
      Object.keys(node).forEach((k) => delete (node as any)[k]);
      Object.assign(
        node,
        createComponentElement({ id: compId, name: compName }, props, {
          imports: new Set(),
          state,
        })
      );
    });

    const importDecls = [...imports]
      .map((componentId) => state.component.registry.get(componentId))
      .filter((r) => !!r)
      .map((r): ImportDeclaration => {
        const mod = path.join(`@`, r.dir, r.name);
        return {
          type: "ImportDeclaration",
          source: { type: "Literal", value: mod },
          specifiers: [
            {
              type: "ImportSpecifier",
              local: { type: "Identifier", name: r.name },
              imported: { type: "Identifier", name: r.name },
            },
          ],
          attributes: [],
        };
      });

    tree.body = [...importDecls, ...tree.body];
  };
