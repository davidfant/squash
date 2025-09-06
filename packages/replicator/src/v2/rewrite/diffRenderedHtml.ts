import { generate, parse, walk, type DeclarationList } from "css-tree";
import { diff } from "jest-diff";
// import { diffLines } from "diff";
import * as parse5 from "parse5";

const normText = (s: string) => s.replace(/\s+/g, " ").trim();

const CSS_PROPERTY_ALIAS: Record<string, string> = {
  "word-wrap": "overflow-wrap",
};
const OPTIONAL_COMMA_FUNCTIONS = ["rect", "inset", "matrix", "matrix3d"];

function canonicaliseStyle(style: string): Record<string, string> {
  const ast = parse(style, { context: "declarationList" }) as DeclarationList;

  walk(ast, (n) => {
    if (n.type === "Dimension") {
      if (n.value === "0") n.unit = "";
    }

    if (n.type === "Declaration") {
      n.property = CSS_PROPERTY_ALIAS[n.property] ?? n.property;
    }

    if (
      n.type === "Function" &&
      OPTIONAL_COMMA_FUNCTIONS.includes(n.name.toLowerCase())
    ) {
      n.children.forEach((child, item, list) => {
        if (child.type === "Operator" && child.value === ",") {
          list.remove(item);
        }
      });
    }
  });

  return ast.children
    .toArray()
    .filter((d) => d.type === "Declaration")
    .sort((a, b) => a.property.localeCompare(b.property))
    .reduce(
      (acc, d) => ({ ...acc, [d.property]: generate(d.value) }),
      {} as Record<string, string>
    );
}

const canonicaliseClass = (className: string) =>
  className
    .split(" ")
    .filter((c) => !!c)
    .sort()
    .join(" ");

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
        const canonical = canonicaliseStyle(value);
        if (!Object.keys(canonical).length) continue;
        attrs[name] = canonical;
      } else if (name === "class") {
        attrs[name] = canonicaliseClass(value);
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

// export function diffRenderedHtml(a: string, b: string) {
//   const lhs = canonicalise(a);
//   const rhs = canonicalise(b);
//   const diffString = diff(lhs, rhs, {
//     aColor: (x) => x,
//     bColor: (x) => x,
//     commonColor: (x) => x,
//   });
//   return diffString === "Compared values have no visual difference."
//     ? null
//     : diffString;
// }
export function diffRenderedHtml(a: string, b: string) {
  const lhs = canonicalise(a);
  const rhs = canonicalise(b);
  // const lhs = JSON.stringify(canonicalise(a), null, 2);
  // const rhs = JSON.stringify(canonicalise(b), null, 2);

  // const changes = diffLines(lhs, rhs);
  // if (changes.every((part) => !part.added && !part.removed)) return null;
  // return changes
  //   .flatMap((part) => {
  //     const prefix = part.added ? "+" : part.removed ? "-" : " ";
  //     return part.value.split("\n").map((line) => `${prefix} ${line}`);
  //   })
  //   .join("\n");

  const diffString = diff(lhs, rhs, {
    aAnnotation: "Expected",
    bAnnotation: "Actual",
    aIndicator: "+",
    bIndicator: "-",
    aColor: (x) => x,
    bColor: (x) => x,
    commonColor: (x) => x,
  });
  return diffString === "Compared values have no visual difference."
    ? null
    : diffString;
}
