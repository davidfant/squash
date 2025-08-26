import * as prettier from "@/lib/prettier";
import { load } from "cheerio";
import recmaJsx from "recma-jsx";
import recmaStringify from "recma-stringify";
import rehypeParse from "rehype-parse";
import rehypeRecma from "rehype-recma";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { SKIP, visit } from "unist-util-visit";
import { createUniqueNames } from "./lib/createUniqueNames";
import { metadataProcessor } from "./lib/metadataProcessor";
import { createRef } from "./lib/recma/createRef";
import { recmaFixProperties } from "./lib/recma/fixProperties";
import { recmaRemoveRedundantFragment } from "./lib/recma/removeRedundantFragment";
import { recmaReplaceRefs } from "./lib/recma/replaceRefs";
import { rehypeStripSquashAttribute } from "./lib/rehype/stripSquashAttribute";
import { recmaWrapAsComponent } from "./lib/rehype/wrapAsComponent";
import type { FileSink } from "./lib/sinks/base";
import { Metadata, type Snapshot } from "./types";
type Root = import("hast").Root;
type Element = import("hast").Element;
type NodeId = Metadata.ReactFiber.NodeId;
type CodeId = Metadata.ReactFiber.CodeId;
type ComponentId = Metadata.ReactFiber.ComponentId;

interface ReplicateOptions {
  stylesAndScripts?: boolean;
  base64Images?: boolean;
  svgs?: boolean;
  buttons?: boolean;
  roles?: boolean;
  blocks?: boolean;
  tags?: boolean;
}

export async function replicate(
  snapshot: Snapshot,
  sink: FileSink<any>,
  _options: ReplicateOptions = {}
) {
  const opts: Required<ReplicateOptions> = {
    stylesAndScripts: true,
    base64Images: true,
    svgs: true,
    buttons: true,
    roles: true,
    blocks: true,
    tags: true,
    ..._options,
  };

  const $ = load(snapshot.page.html);

  const html = $("html") ?? $("html");
  const head = $("head") ?? $("head");
  const body = $("body") ?? $("body");
  const htmlAttrs = Array.from(html[0]?.attributes ?? []);
  const bodyAttrs = Array.from(body[0]?.attributes ?? []);

  // $('script[type="application/json"]').remove();
  // $('script[type="application/ld+json"]').remove();
  $("script").remove();

  body.find("link,style").each((_, tag) => {
    $(tag).remove();
    head.append(tag);
  });

  // 1. group all elements by data-squash-parent-id

  const m = snapshot.metadata;
  if (!m) throw new Error("Metadata is required");

  const nodes = Object.entries(m.nodes).map(([id, n]) => ({
    id: id as NodeId,
    ...n,
  }));
  const comps = Object.entries(m.components).map(([id, c]) => ({
    id: id as ComponentId,
    ...c,
  }));

  // const rootNode = nodes.find(
  //   (node) =>
  //     m.components[node.componentId]?.tag ===
  //     Metadata.ReactFiber.Component.Tag.HostRoot
  // );

  // if (!rootNode) throw new Error("No root node found");

  const compNameById = createUniqueNames(m.components);
  const codeIdToComponentId = new Map<CodeId, ComponentId>(
    comps
      .map((c) =>
        "codeId" in c && c.codeId ? ([c.codeId, c.id] as const) : undefined
      )
      .filter((v) => !!v)
  );

  await unified()
    .use(rehypeParse, { fragment: true })
    .use(() => (tree: Root) => {
      return metadataProcessor(m, async (group) => {
        if ("codeId" in group.component) {
          // const code = m.code[group.component.codeId]!;

          const elements: Array<{
            element: Element;
            index: number;
            parent: Root | Element;
            nodeId: NodeId;
          }> = [];

          visit(tree, "element", (element, index, parent) => {
            if (index === undefined) return;
            const nodeId = element.properties?.["dataSquashNodeId"] as NodeId;
            if (parent?.type !== "element" && parent?.type !== "root") return;

            const n = m.nodes[nodeId];
            if (n && n.parentId !== null && n.parentId in group.nodes) {
              elements.push({ element, index, parent, nodeId: n.parentId });
              return SKIP;
            }
          });

          const componentName = compNameById.get(group.id)!;

          if (!elements.length) return;
          const processor = unified()
            .use(rehypeStripSquashAttribute)
            .use(rehypeRecma)
            .use(recmaJsx)
            .use(recmaRemoveRedundantFragment)
            .use(recmaWrapAsComponent, componentName)
            .use(recmaReplaceRefs)
            .use(recmaFixProperties)
            .use(recmaStringify);

          const elementsByNodeId = elements.reduce(
            (acc, el) => ({
              ...acc,
              [el.nodeId]: [...(acc[el.nodeId] ?? []), el],
            }),
            {} as Record<NodeId, typeof elements>
          );

          // TODO: group elements by nodeId, and then create one single component using the group
          const estree = await processor.run({
            type: "root",
            children: Object.values(elementsByNodeId)[0]!.map((e) => e.element),
          });
          await sink.writeText(
            `src/components/${componentName}.tsx`,
            await prettier.ts(processor.stringify(estree))
          );

          const codeIdToComponentImport = new Map(
            Array.from(codeIdToComponentId.entries()).map(
              ([codeId, componentId]) => {
                const name = compNameById.get(componentId)!;
                return [codeId, { module: `@/components/${name}`, name }];
              }
            )
          );

          for (const [nodeId, elements] of Object.entries(elementsByNodeId)) {
            const { index, parent } = elements[0]!;
            const props = nodes.find((n) => n.id === nodeId)!.props as Record<
              string,
              unknown
            >;
            parent.children[index] = createRef({
              component: {
                module: `@/components/${componentName}`,
                name: componentName,
              },
              props,
              nodeId,
              ctx: { codeIdToComponentImport },
            });
            elements.slice(1).forEach((e) => (e.element.tagName = "rm"));
          }

          elements.forEach(({ parent }) => {
            parent.children = parent.children.filter(
              (el) => el.type !== "element" || el.tagName !== "rm"
            );
          });
        } else if (
          group.component.tag === Metadata.ReactFiber.Component.Tag.HostRoot
        ) {
          const processor = unified()
            .use(rehypeStripSquashAttribute)
            .use(rehypeRecma)
            .use(recmaJsx)
            .use(recmaRemoveRedundantFragment)
            .use(recmaWrapAsComponent, "App")
            .use(recmaReplaceRefs)
            .use(recmaFixProperties)
            .use(recmaStringify);

          // const estree = await processor.run(tree);
          const estree = await processor.run(JSON.parse(JSON.stringify(tree)));
          await sink.writeText(
            "src/App.tsx",
            await prettier.ts(processor.stringify(estree))
          );
        }
      });
    })
    .use(rehypeStringify)
    .process(snapshot.page.html);

  const replicatedHtml = `
<!DOCTYPE html>
<html ${htmlAttrs.map((a) => `${a.name}="${a.value}"`).join(" ")}>
  <head>${head.html() ?? ""}</head>
  <body ${bodyAttrs.map((a) => `${a.name}="${a.value}"`).join(" ")}>
  </body>
  <script type="module" src="/src/main.tsx"></script>
</html>
  `.trim();
  await prettier
    .html(replicatedHtml)
    .then((text) => sink.writeText("index.html", text));
}
