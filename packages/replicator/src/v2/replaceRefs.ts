import type { Metadata, RefImport } from "@/types";
import * as acorn from "acorn";
import acornJsx from "acorn-jsx";
import type { ImportDeclaration, NodeMap, Program } from "estree";
import { SKIP, visit } from "estree-util-visit";
import type { Plugin } from "unified";
import type { ReplicatorState } from "./state";

type ComponentId = Metadata.ReactFiber.ComponentId;

const JSXParser = acorn.Parser.extend(acornJsx());
function parseJSX(code: string) {
  const ast = JSXParser.parse(code, {
    ecmaVersion: "latest",
    sourceType: "module",
  });
  if (ast.body[0]!.type === "ExpressionStatement") {
    return ast.body[0]!.expression;
  } else {
    console.error(code);
    console.error(ast.body[0]);
    throw new Error("Expected ExpressionStatement");
  }
}

const recmaReplaceRefs: Plugin<[state: ReplicatorState], Program> =
  (state) => (tree: Program) => {
    const imports = new Map<string, RefImport>();
    const addImport = (i: RefImport) => imports.set(JSON.stringify(i), i);

    const findAttr = <T>(element: NodeMap["JSXElement"], name: string) => {
      const attr = element.openingElement.attributes.find(
        (a): a is NodeMap["JSXAttribute"] =>
          a.type === "JSXAttribute" && a.name.name === name
      );
      if (attr?.value?.type !== "Literal") return;
      return attr.value.value as T;
    };

    visit(tree, (node, key, idx, ancestors) => {
      // existing imports
      if (node.type === "ImportDeclaration") {
        const module = node.source.value as string;
        for (const spec of node.specifiers) {
          if (spec.type === "ImportDefaultSpecifier") {
            addImport({ module, name: spec.local.name, default: true });
          } else if (
            spec.type === "ImportSpecifier" &&
            spec.imported.type === "Identifier"
          ) {
            addImport({ module, name: spec.imported.name });
          }
        }
      }

      // imports from <ref ... />
      if (
        node.type === "JSXElement" &&
        node.openingElement?.name?.type === "JSXIdentifier" &&
        node.openingElement.name.name === "ref"
      ) {
        const depsString = findAttr<string>(node, "deps");
        const jsxString = findAttr<string>(node, "jsx");
        if (!!depsString) {
          const deps = JSON.parse(depsString) as ComponentId[];
          for (const dep of deps) {
            const c = state.component.registry.get(dep);
            // if (c?.code) {
            if (c) {
              // addImport({ module: c.module, name: c.name.value });
            } else {
              throw new Error(`Component ${dep} not found in registry`);
            }
          }
        }

        if (!!jsxString) {
          const jsx = parseJSX(jsxString);
          const parent = ancestors.at(-1)!;
          if (typeof idx === "number") {
            // @ts-ignore
            parent[key!][idx] = jsx;
          } else {
            // @ts-ignore
            parent[key!] = jsx;
          }

          // Don’t walk into the brand-new subtree
          return SKIP;
        }
      }
    });

    const importDecls = new Map<string, ImportDeclaration>();
    for (const i of imports.values()) {
      if (!importDecls.has(i.module)) {
        importDecls.set(i.module, {
          type: "ImportDeclaration",
          source: { type: "Literal", value: i.module, raw: `'${i.module}'` },
          specifiers: [],
          attributes: [],
        });
      }

      if (i.default) {
        importDecls.get(i.module)!.specifiers.push({
          type: "ImportDefaultSpecifier",
          local: { type: "Identifier", name: i.name },
        });
      } else {
        importDecls.get(i.module)!.specifiers.push({
          type: "ImportSpecifier",
          imported: { type: "Identifier", name: i.name },
          local: { type: "Identifier", name: i.name },
        });
      }
    }

    tree.body = [...importDecls.values(), ...tree.body];
  };
