import * as prettier from "@/lib/prettier";
import { load } from "cheerio";
import { h } from "hastscript";
import recmaJsx from "recma-jsx";
import recmaStringify from "recma-stringify";
import rehypeParse from "rehype-parse";
import rehypeRecma from "rehype-recma";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { SKIP, visit } from "unist-util-visit";
import { metadataProcessor } from "./lib/metadataProcessor";
import { recmaRemoveRedundantFragment } from "./lib/recma/removeRedundantFragment";
import { recmaReplaceRefs } from "./lib/recma/replaceRefs";
import { rehypeStripSquashAttribute } from "./lib/rehype/stripSquashAttribute";
import { recmaWrapAsComponent } from "./lib/rehype/wrapAsComponent";
import type { FileSink } from "./lib/sinks/base";
import { Metadata, type RefImport, type Snapshot } from "./types";
type Root = import("hast").Root;
type Element = import("hast").Element;

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

  const nodes = Object.entries(m.nodes).map(([id, n]) => ({ id, ...n }));
  const comps = Object.entries(m.components).map(([id, c]) => ({ id, ...c }));

  // const rootNode = nodes.find(
  //   (node) =>
  //     m.components[node.componentId]?.tag ===
  //     Metadata.ReactFiber.Component.Tag.HostRoot
  // );

  // if (!rootNode) throw new Error("No root node found");

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
            nodeId: Metadata.ReactFiber.NodeId;
          }> = [];

          visit(tree, "element", (element, index, parent) => {
            if (index === undefined) return;
            const nodeId = element.properties?.[
              "dataSquashNodeId"
            ] as Metadata.ReactFiber.NodeId;
            if (parent?.type !== "element" && parent?.type !== "root") return;

            const n = m.nodes[nodeId];
            if (n && n.parentId !== null && n.parentId in group.nodes) {
              elements.push({ element, index, parent, nodeId: n.parentId });
              return SKIP;
            }
          });

          const componentName =
            group.component.name ?? `Component${group.id.slice(1)}`;

          if (!elements.length) return;
          const processor = unified()
            .use(rehypeStripSquashAttribute)
            .use(rehypeRecma)
            .use(recmaJsx)
            // .use(recmaFixProperties)
            .use(recmaRemoveRedundantFragment)
            .use(recmaWrapAsComponent, componentName)
            .use(recmaReplaceRefs)
            .use(recmaStringify);

          const elementsByNodeId = elements.reduce(
            (acc, el) => ({
              ...acc,
              [el.nodeId]: [...(acc[el.nodeId] ?? []), el],
            }),
            {} as Record<number, typeof elements>
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

          for (const elements of Object.values(elementsByNodeId)) {
            const { index, parent } = elements[0]!;
            parent.children[index] = h("ref", {
              imports: JSON.stringify([
                {
                  module: `@/components/${componentName}`,
                  name: componentName,
                },
              ] satisfies RefImport[]),
              jsx: `<${componentName} />`,
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
            // .use(recmaFixProperties)
            .use(recmaRemoveRedundantFragment)
            .use(recmaWrapAsComponent, "App")
            .use(recmaReplaceRefs)
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
    // .use(() => async (tree: Root) => {
    //   const sel = (node: Element) =>
    //     node.properties &&
    //     // node.properties["data-squash-parent-id"] === rootNode.id;
    //     node.properties["dataSquashNodeId"] === rootNode.id;

    //   const elements: Array<{
    //     node: Element;
    //     index: number;
    //     parent: Root | Element;
    //   }> = [];

    //   visit(tree, "element", (node, index, parent) => {
    //     if (index === undefined || !sel(node)) return;
    //     if (parent?.type !== "element" && parent?.type !== "root") return;
    //     elements.push({ node, index, parent });
    //     return SKIP;
    //   });

    //   if (!elements.length) return;
    //   const processor = unified()
    //     .use(rehypeStripSquashAttribute)
    //     .use(rehypeRecma)
    //     .use(recmaJsx)
    //     // .use(recmaReplaceRefs)
    //     // .use(recmaFixProperties)
    //     .use(recmaRemoveRedundantFragment)
    //     .use(recmaWrapAsComponent, "App")
    //     .use(recmaStringify);

    //   const estree = await processor.run({
    //     type: "root",
    //     children: elements.map(({ node }) => node),
    //   });
    //   await sink.writeText("src/App.tsx", processor.stringify(estree));

    //   const { index, parent } = elements[0]!;
    //   parent.children[index] = h("ref", {
    //     imports: JSON.stringify([{ path: "./src/App", name: "App" }]),
    //     jsx: "<App />",
    //   });
    //   parent.children = parent.children.filter((_, i) => i === index);

    //   // // replace node with <ref .../>
    //   // const idx = (parent.children as any[]).indexOf(node);
    //   // (parent.children as any[])[idx] = h("ref", {
    //   //   src: ref.src,
    //   //   jsx: ref.jsx,
    //   // }) as any;
    //   // remove
    // })
    .use(rehypeStringify)
    .process(snapshot.page.html);

  // const rootNodeChildSelector = `[data-squash-parent-id="${rootNode.id}"]`;
  // const elements = $(rootNodeChildSelector)
  //   .filter(function () {
  //     return !$(this).parents(rootNodeChildSelector).length;
  //   })
  //   .toArray();

  // console.log(elements);

  // find the root node
  // find all elements connected to the root node
  // extract them into a component

  /*
  const [body, head] = await Promise.all([
    unified()
      .use(rehypeParse, { fragment: true })
      .use(rehypeMinifyWhitespace)
      .use(rehypeRemoveComments)
      .use(rehypeRemoveScripts)
      .use(opts.stylesAndScripts ? rehypeExtractStylesAndScripts(ctx) : noop)
      .use(opts.base64Images ? rehypeExtractBase64Images(sink) : noop)
      .use(opts.svgs ? rehypeExtractSVGs(sink) : noop)
      // .use(opts.buttons ? rehypeDesignSystemButtons(sink) : noop)
      .use(opts.buttons ? rehypeExtractButtons(sink) : noop)
      .use(opts.roles ? rehypeExtractRoles(sink) : noop)
      .use(opts.blocks ? rehypeExtractBlocks(sink) : noop)
      .use(opts.tags ? rehypeExtractTags(sink) : noop)
      .use(rehypeRecma)
      .use(recmaJsx)
      .use(recmaReplaceRefs)
      .use(recmaFixProperties)
      .use(recmaRemoveRedundantFragment)
      .use(recmaStringify)
      // TODO: body
      .process(snapshot.page.html),

    unified()
      .use(rehypeParse, { fragment: false })
      .use(rehypeRemoveScripts)
      .use(rehypeExtractBodyAttributes(ctx))
      .use(rehypeIdentifyUrlsToDownload(ctx))
      .use(rehypeStringify)
      // TODO: body
      .process(snapshot.page.html)
      .then(async () => {
        const head = await unified()
          .use(rehypeParse, { fragment: true })
          .use(rehypeMinifyWhitespace)
          .use(rehypeRemoveComments)
          .use(rehypeRemoveScripts)
          .use(rehypeIdentifyUrlsToDownload(ctx))
          .use(rehypeStringify)
          .process(
            [
              // TODO: head
              snapshot.page.html,
              ...ctx.tagsToMoveToHead,
            ].join("\n")
          );
        await Promise.all(
          Array.from(ctx.urlsToDownload).map(async (relativeUrl) => {
            const url = new URL(relativeUrl, snapshot.page.url);
            if (url.href.length > 255) {
              // TODO: rename the urls to download to something shorter
              console.warn(`Skipping ${url.href} because it's too long`);
              return;
            }

            const response = await fetch(url.href);
            if (!response.ok) {
              throw new Error(
                `Failed to download ${url}: ${response.status} ${response.statusText}`
              );
            }

            const buffer = Buffer.from(await response.arrayBuffer());
            await sink.writeBytes(path.join("public", url.pathname), buffer);
          })
        );

        return head;
      }),
    // prettier
    //   .css(page.css)
    //   .then((text) => sink.writeText("public/styles.css", text)),
    // prettier
    //   .js(page.js)
    //   .then((text) => sink.writeText("public/script.js", text)),
  ]);

  */

  // const replicatedHtml = `
  //   <!DOCTYPE html>
  //   <html lang="en">
  //     <head>
  //       ${head}
  //       <link rel="stylesheet" href="/styles.css" />
  //     </head>
  //     <body ${Object.entries(ctx.bodyAttributes)
  //       .map(([key, value]) => `${key}="${value}"`)
  //       .join(" ")}>
  //     </body>
  //     <script type="module" src="/src/main.tsx"></script>
  //   </html>
  // `.trim();
  const replicatedHtml = `
<!DOCTYPE html>
<html ${htmlAttrs.map((a) => `${a.name}="${a.value}"`).join(" ")}>
  <head>${head.html() ?? ""}</head>
  <body ${bodyAttrs.map((a) => `${a.name}="${a.value}"`).join(" ")}>
  </body>
  <script type="module" src="/src/main.tsx"></script>
</html>
  `.trim();
  await Promise.all([
    prettier
      .html(replicatedHtml)
      .then((text) => sink.writeText("index.html", text)),
    // prettier
    //   .ts(String(body))
    //   .then((text) => sink.writeText("src/App.tsx", text)),
  ]);
}
