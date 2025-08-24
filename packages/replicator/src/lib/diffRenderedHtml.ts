import { diff } from "jest-diff";
import * as parse5 from "parse5";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const normText = (s: string) => s.replace(/\s+/g, " ").trim();

function simplify(
  node: parse5.DefaultTreeAdapterMap[keyof parse5.DefaultTreeAdapterMap]
): unknown {
  if (node.nodeName === "#comment") return null;
  if (node.nodeName === "#text") {
    const text = normText(
      (node as parse5.DefaultTreeAdapterMap["textNode"]).value
    );
    return text ? text : null;
  }

  const children = "childNodes" in node ? node.childNodes : [];
  return {
    tag: node.nodeName,
    attrs:
      "attrs" in node
        ? Object.fromEntries(node.attrs.map((a) => [a.name, a.value]))
        : {},
    children: children.map(simplify).filter(Boolean),
  };
}

function canonicalise(html: string) {
  const dom = parse5.parseFragment(html, { sourceCodeLocationInfo: false });
  // return JSON.stringify(simplify(dom), null, 2);
  return simplify(dom);
}

export function diffRenderedHtml(html: string, node: ReactNode) {
  const rendered = renderToStaticMarkup(node);

  const lhs = canonicalise(html);
  const rhs = canonicalise(rendered);

  const string = diff(lhs, rhs, {
    aColor: (x) => x,
    bColor: (x) => x,
    commonColor: (x) => x,
  });
  return string === "Compared values have no visual difference."
    ? null
    : string;
}
