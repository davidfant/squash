import type { Metadata, RefImport } from "@/types";
import type { NodeMap } from "estree";
import type { ElementContent } from "hast";
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
  imports: RefImport[],
  ctx: Context
): any {
  if (Array.isArray(value)) {
    const replaced: any[] = [];
    for (const v of value) {
      const r = replaceReactElements(v, imports, ctx);
      replaced.push(r);
    }
    return replaced;
  } else if (typeof value === "object" && value !== null) {
    switch (value.$$typeof) {
      case "react.code": {
        const el = value as Metadata.ReactFiber.Element.Code;
        const { children, ...rest } = el.props;
        const built = buildAttributes(rest, ctx);
        built.imports.forEach((i) => addImport(i, imports));

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
        const { children, ...rest } = el.props;
        const built = buildAttributes(rest, ctx);
        built.imports.forEach((i) => addImport(i, imports));

        return createComponentElement(
          { module: undefined, name: el.tagName },
          value.props,
          imports,
          ctx
        );
      }
      case "react.fragment": {
        const f = value as Metadata.ReactFiber.Element.Fragment;
        const children = f.children.map((c) =>
          replaceReactElements(c, imports, ctx)
        );
        const fragment: NodeMap["JSXFragment"] = {
          type: "JSXFragment",
          openingFragment: { type: "JSXOpeningFragment" },
          children,
          closingFragment: { type: "JSXClosingFragment" },
        };
        return fragment;
      }
    }

    const replaced: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      replaced[k] = replaceReactElements(v, imports, ctx);
    }

    return replaced;
  }

  return value;
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
      const replaced = replaceReactElements(v, imports, ctx);
      return {
        type: "JSXAttribute",
        name: { type: "JSXIdentifier", name: k },
        value: { type: "JSXExpressionContainer", expression: replaced },
      };
    }
  );

  return { attributes, imports };
}

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
        const replaced = replaceReactElements(child, imports, ctx);
        childNodes.push(replaced);
      }
    });

  return {
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
          const replaced = replaceReactElements(value, imports, ctx);
          return {
            type: "JSXExpressionContainer",
            expression: { type: "Literal", value: replaced },
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
