import { diff } from "jest-diff";
import * as parse5 from "parse5";

const normText = (s: string) => s.replace(/\s+/g, " ").trim();

const inlineStyleToObj = (style: string) =>
  style
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean)
    .reduce(
      (obj, chunk) => {
        const [rawProp, ...rest] = chunk.split(":");
        if (!rawProp || rest.length === 0) return obj;
        const prop = rawProp.trim();
        const value = rest.join(":").trim();
        if (prop) obj[prop] = value;
        return obj;
      },
      {} as Record<string, string>
    );

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
  let attrs: Record<string, unknown> = {};
  if ("attrs" in node) {
    for (const { name, value } of node.attrs) {
      if (name === "style") {
        attrs[name] = inlineStyleToObj(value);
      } else {
        attrs[name] = value;
      }
    }
  }

  return {
    tag: node.nodeName,
    attrs,
    children: children.map(simplify).filter(Boolean),
  };
}

function canonicalise(html: string) {
  const dom = parse5.parseFragment(html, { sourceCodeLocationInfo: false });
  // return JSON.stringify(simplify(dom), null, 2);
  return simplify(dom);
}

export function diffRenderedHtml(a: string, b: string) {
  const lhs = canonicalise(a);
  const rhs = canonicalise(b);
  const diffString = diff(lhs, rhs, {
    aColor: (x) => x,
    bColor: (x) => x,
    commonColor: (x) => x,
  });
  return diffString === "Compared values have no visual difference."
    ? null
    : diffString;
}
