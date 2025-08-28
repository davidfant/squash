import * as prettier from "@/lib/prettier";
import { load } from "cheerio";
import path from "path";
import recmaJsx from "recma-jsx";
import recmaStringify from "recma-stringify";
import rehypeParse from "rehype-parse";
import rehypeRecma from "rehype-recma";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { SKIP, visit } from "unist-util-visit";
import { downloadRemoteUrl } from "./lib/assets/downloadRemoteAsset";
import { identifyUrlsToDownload } from "./lib/assets/identifyRemoveAssetsToDownload";
import { fuseMemoForwardRef } from "./lib/fuseMemoForwardRef";
import { buildParentMap, metadataProcessor } from "./lib/metadataProcessor";
import { createRef } from "./lib/recma/createRef";
import { recmaFixProperties } from "./lib/recma/fixProperties";
import { recmaRemoveRedundantFragment } from "./lib/recma/removeRedundantFragment";
import { recmaReplaceRefs } from "./lib/recma/replaceRefs";
import { rehypeStripSquashAttribute } from "./lib/rehype/stripSquashAttribute";
import { recmaWrapAsComponent } from "./lib/rehype/wrapAsComponent";
import { generateComponent } from "./lib/rewriteComponent/generate";
import type { FileSink } from "./lib/sinks/base";
import { uniquePathsForComponents } from "./lib/uniquePathsForComponents";
import { Metadata, type Snapshot } from "./types";

type Root = import("hast").Root;
type Element = import("hast").Element;
type NodeId = Metadata.ReactFiber.NodeId;
type CodeId = Metadata.ReactFiber.CodeId;
type ComponentId = Metadata.ReactFiber.ComponentId;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

async function writeFile(
  componentName: string,
  dir: string,
  root: Root,
  sink: FileSink
) {
  const processor = unified()
    .use(rehypeStripSquashAttribute)
    .use(rehypeRecma)
    .use(recmaJsx)
    .use(recmaRemoveRedundantFragment)
    .use(recmaWrapAsComponent, componentName)
    .use(recmaReplaceRefs)
    .use(recmaFixProperties)
    .use(recmaStringify);

  const estree = await processor.run(clone(root));
  await sink.writeText(
    path.join(dir, `${componentName}.tsx`),
    await prettier.ts(processor.stringify(estree))
  );
}

export async function replicate(snapshot: Snapshot, sink: FileSink<any>) {
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

  const urlsToDownload = identifyUrlsToDownload($, snapshot.page.url);
  const urlsToDownloadP = Promise.all(
    Array.from(urlsToDownload).map((str) =>
      downloadRemoteUrl(new URL(str), sink)
    )
  );

  // download every img src tag

  const m = snapshot.metadata;
  if (!m) throw new Error("Metadata is required");
  fuseMemoForwardRef(m);

  const nodes = Object.entries(m.nodes).map(([id, n]) => ({
    id: id as NodeId,
    ...n,
  }));
  const comps = Object.entries(m.components).map(([id, c]) => ({
    id: id as ComponentId,
    ...c,
  }));

  const compPathById = uniquePathsForComponents(m.components);
  const codeIdToComponentImport = new Map(
    comps
      .map((c) => {
        if (!("codeId" in c)) return;
        const p = compPathById.get(c.id)!;
        const m = path.join("@/components", p.dir, p.name);
        return [c.codeId, { module: m, name: p.name }] as const;
      })
      .filter((v) => !!v)
  );

  const parentMap = buildParentMap(m.nodes);

  await unified()
    .use(rehypeParse, { fragment: true })
    .use(() => (tree: Root) => {
      return metadataProcessor(m, async (group) => {
        if ("codeId" in group.component) {
          // const code = m.code[group.component.codeId]!;

          const elementsByNodeId = new Map<
            NodeId,
            Array<{
              element: Element;
              index: number;
              parent: Root | Element;
              nodeId: NodeId;
            }>
          >();

          for (const parentId of Object.keys(group.nodes) as NodeId[]) {
            visit(tree, "element", (element, index, parent) => {
              if (index === undefined) return;
              const nodeId = element.properties?.["dataSquashNodeId"] as NodeId;
              if (parent?.type !== "element" && parent?.type !== "root") return;

              if (parentMap.get(nodeId)?.has(parentId)) {
                elementsByNodeId.set(parentId, [
                  ...(elementsByNodeId.get(parentId) ?? []),
                  { element, index, parent, nodeId },
                ]);
                return SKIP;
              }
            });
          }

          if (group.id === "C53") {
            console.log(group, elementsByNodeId);
          }

          const compPath = compPathById.get(group.id)!;

          // TODO: what do we do about this? The component never has a node, however it
          // might still be called in some react element props somewhere.
          if (![...elementsByNodeId.values()].flat().length) {
            await sink.writeText(
              path.join(
                "src",
                "components",
                compPath.dir,
                `${compPath.name}.tsx`
              ),
              `export const ${compPath.name} = () => null;`
            );
            return;
          }

          // text
          // if (group.id === "C24") {
          // typography
          // if (group.id === "C24") {
          // icon
          if (group.id === "C40") {
            const rewritten = await generateComponent({
              code: m.code[group.component.codeId]!,
              component: {
                name: compPath.name,
                module: path.join("@/components", compPath.dir, compPath.name),
              },
              createRefContext: { codeIdToComponentImport },
              instances: Object.entries(group.nodes).map(([nid, node]) => {
                const nodeId = nid as NodeId;
                const elements = (elementsByNodeId.get(nodeId) ?? []).map(
                  (e) => e.element
                );
                return { nodeId, node, elements: clone(elements) };
              }),
            });

            // TODO: create some kind of old => new name mapping so that we can update this later...
            await sink.writeText(
              path.join(
                "src",
                "components",
                compPath.dir,
                `${rewritten.name}.tsx`
              ),
              rewritten.code
            );
            return;
          }

          await writeFile(
            compPath.name,
            path.join("src", "components", compPath.dir),
            {
              type: "root",
              children:
                elementsByNodeId
                  .values()
                  .next()
                  .value?.map((e) => e.element) ?? [],
            },
            sink
          );

          const elementsOrderedByDepth = [...elementsByNodeId.entries()]
            .map(([nodeId, elements]) => ({ nodeId, elements }))
            .sort(
              (a, b) =>
                (parentMap.get(b.nodeId)?.size ?? 0) -
                (parentMap.get(a.nodeId)?.size ?? 0)
            );

          // Note(fant): loop over elements in reverse, so that we replace the innermost elements first.
          // TODO: for testing, try saving all of these separately to see if it works
          for (const { nodeId, elements } of elementsOrderedByDepth) {
            if (!elements.length) continue;

            // const compName = compPath.name;
            const compName = `${compPath.name}_${nodeId}`;
            await writeFile(
              compName,
              path.join("src", "components", compPath.dir),
              { type: "root", children: elements.map((e) => e.element) ?? [] },
              sink
            );

            const { index, parent } = elements[0]!;
            const props = nodes.find((n) => n.id === nodeId)!.props as Record<
              string,
              unknown
            >;
            // Note(fant): we need to Object.assign instead of replace because some
            // of the elements detected might point at the parent being replaced
            Object.assign(
              parent.children[index]!,
              createRef({
                component: {
                  module: path.join("@/components", compPath.dir, compName),
                  name: compName,
                },
                props,
                nodeId,
                ctx: { codeIdToComponentImport },
                // Note(fant): for now we keep the children within the ref, so that in the processor loop we still can find elements of a certain node.
                children: clone(elements.map((e) => e.element)),
              })
            );
            elements.slice(1).forEach((e) => (e.element.tagName = "rm"));
          }

          [...elementsByNodeId.values()].flat().forEach(({ parent }) => {
            parent.children = parent.children.filter(
              (el) => el.type !== "element" || el.tagName !== "rm"
            );
          });
        } else if (
          group.component.tag === Metadata.ReactFiber.Component.Tag.HostRoot
        ) {
          await writeFile("App", "src", clone(tree), sink);
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
  await urlsToDownloadP;
}
