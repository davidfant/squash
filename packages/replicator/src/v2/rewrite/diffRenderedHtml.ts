import * as prettier from "@/lib/prettier";
import { generate, parse, walk, type DeclarationList } from "css-tree";
import { diffLines } from "diff";
import * as parse5 from "parse5";

const normText = (s: string) => s.replace(/\s+/g, " ").trim();

const CSS_PROPERTY_ALIAS: Record<string, string> = {
  "word-wrap": "overflow-wrap",
};
const OPTIONAL_COMMA_FUNCTIONS = ["rect", "inset", "matrix", "matrix3d"];

function canonicaliseStyle(style: string): string {
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
    .map((d) => `${d.property}: ${generate(d.value)}`)
    .join("; ");
}

const canonicaliseClass = (className: string) =>
  className
    .split(" ")
    .filter((c) => !!c)
    .sort()
    .join(" ");

function simplify<
  T extends parse5.DefaultTreeAdapterMap[keyof parse5.DefaultTreeAdapterMap],
>(node: T): T {
  if ("childNodes" in node) {
    node.childNodes = node.childNodes.map(simplify);
  }
  if ("attrs" in node) {
    node.attrs.sort((a, b) => a.name.localeCompare(b.name));
    node.attrs.forEach((attr) => {
      if (attr.name === "style") {
        attr.value = canonicaliseStyle(attr.value);
      }
      if (attr.name === "class") {
        attr.value = canonicaliseClass(attr.value);
      }
    });
  }

  return node;
}

function canonicalise(html: string) {
  const dom = parse5.parseFragment(html, { sourceCodeLocationInfo: false });
  // return JSON.stringify(simplify(dom), null, 2);
  return parse5.serialize(simplify(dom));
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
export async function diffRenderedHtml(a: string, b: string) {
  const [lhs, rhs] = await Promise.all([
    prettier.html(canonicalise(a)),
    prettier.html(canonicalise(b)),
  ]);

  const changes = diffLines(lhs.trimEnd(), rhs.trimEnd());
  if (changes.every((part) => !part.added && !part.removed)) return null;
  return changes
    .flatMap((p) => {
      const prefix = p.added ? "+" : p.removed ? "-" : " ";
      // part.value always ends with a newline
      return p.value
        .replace(/\n$/, "")
        .split("\n")
        .map((line) => `${prefix} ${line}`);
    })
    .join("\n");
}
