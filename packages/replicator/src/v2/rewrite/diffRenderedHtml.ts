import * as prettier from "@/lib/prettier";
import { generate, parse, walk, type DeclarationList } from "css-tree";
import { createPatch } from "diff";
import * as parse5 from "parse5";

const normText = (s: string) => s.replace(/\s+/g, " ").trim();

const CSS_PROPERTY_ALIAS: Record<string, string> = {
  "word-wrap": "overflow-wrap",
};
const OPTIONAL_COMMA_FUNCTIONS = ["rect", "inset", "matrix", "matrix3d"];

function canonicaliseStyle(style: string): string | undefined {
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
    .filter((c, i, a) => a.indexOf(c) === i)
    .sort()
    .join(" ");

function simplify<
  T extends parse5.DefaultTreeAdapterMap[keyof parse5.DefaultTreeAdapterMap],
>(node: T): T {
  if ("childNodes" in node) {
    node.childNodes = node.childNodes.map(simplify);
  }
  if ("attrs" in node) {
    node.attrs = node.attrs
      .map((attr) => {
        if (attr.name === "style") {
          const style = canonicaliseStyle(attr.value);
          if (style) {
            return { name: "style", value: style };
          } else {
            return undefined;
          }
        }
        if (attr.name === "class") {
          return { name: "class", value: canonicaliseClass(attr.value) };
        }
        return attr;
      })
      .filter((v) => !!v)
      .sort((a, b) => a.name.localeCompare(b.name));
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

  if (lhs === rhs) return;
  const lines = createPatch("diff", lhs.trimEnd(), rhs.trimEnd(), "", "", {
    context: 5,
  })
    .split("\n")
    .slice(4);

  const maxLines = 50;
  if (lines.length > maxLines) {
    const linesToRemove = lines.length - maxLines;
    lines.splice(maxLines, linesToRemove);
    lines.push(`... ${linesToRemove} lines redacted ...`);
  }

  return lines.join("\n");
}
