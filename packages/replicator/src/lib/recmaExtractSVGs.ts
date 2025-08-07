// import { visit } from "estree-util-visit";
// import { generate } from "astring";
// import crypto from "node:crypto";
// import fs from "node:fs";
// import path from "node:path";
// import type { Plugin } from "unified";

// interface Options {
//   outDir?: string; // relative to the MDX file
//   prefix?: string; // React component prefix
// }

// export const recmaExtractSvgs: Plugin<[Options?]> = (opts = {}) => {
//   const { outDir = "icons", prefix = "Svg" } = opts;

//   return async (tree: any, file: any) => {
//     const program = tree; // `Program` node (already ESTree)
//     const seen = new Map<string, string>();

//     await visit(tree, (node, index, parent) => {
//       if (node.type !== "JSXElement") return;
//       const name = node.openingElement?.name;
//       if (name.type !== "JSXIdentifier" || name.name !== "svg") return;

//             const name = node.openingElement?.name;
//             if (name?.type !== "JSXIdentifier" || name.name !== "svg") return;

//             // 1. Hash the raw SVG for deduplication
//             const rawSvg = generate(node, { jsx: true });
//             const hash = crypto
//               .createHash("sha1")
//               .update(rawSvg)
//               .digest("hex")
//               .slice(0, 8);
//             const compName = seen.get(hash) ?? `${prefix}${hash}`;

//             // Only write/import once per unique hash
//             if (!seen.has(hash)) {
//               seen.set(hash, compName);

//               // 2. Emit the standalone component file
//               const fileDir = path.dirname(file.path); // <file>.mdx location
//               const targetDir = path.join(fileDir, outDir);
//               fs.mkdirSync(targetDir, { recursive: true });

//               const componentSource = `import * as React from 'react';
//       import type { SVGProps } from 'react';

//       export default function ${compName}(props: SVGProps<SVGSVGElement>) {
//         return (
//           ${rawSvg.replace(/^<svg/, "<svg {...props}")}  // preserve attrs
//         );
//       }
//       `;
//               fs.writeFileSync(
//                 path.join(targetDir, `${compName}.tsx`),
//                 componentSource
//               );

//               // 3. Inject `import …` at top of Program.body
//               program.body.unshift({
//                 type: "ImportDeclaration",
//                 specifiers: [
//                   {
//                     type: "ImportDefaultSpecifier",
//                     local: { type: "Identifier", name: compName },
//                   },
//                 ],
//                 source: { type: "Literal", value: `./${outDir}/${compName}.tsx` },
//               });
//             }

//             // 4. Replace inline <svg> with <SvgHash … />
//             const newNode = {
//               type: "JSXElement",
//               openingElement: {
//                 type: "JSXOpeningElement",
//                 name: { type: "JSXIdentifier", name: compName },
//                 attributes: node.openingElement.attributes, // keep width/height/viewBox/etc.
//                 selfClosing: true,
//               },
//               closingElement: null,
//               children: [],
//             };
//             // parent.children[index] = newNode;
//     });
//   };
// };
