import * as prettier from "@/lib/prettier";
import { load } from "cheerio";
import { traceable } from "langsmith/traceable";
import recmaJsx from "recma-jsx";
import recmaStringify from "recma-stringify";
import rehypeParse from "rehype-parse";
import rehypeRecma from "rehype-recma";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { SKIP, visit } from "unist-util-visit";
import { langsmith } from "./lib/ai";
import { downloadRemoteUrl } from "./lib/assets/downloadRemoteAsset";
import { identifyUrlsToDownload } from "./lib/assets/identifyRemoveAssetsToDownload";
import {
  buildInitialComponentRegistry,
  type ComponentRegistry,
} from "./lib/componentRegistry";
import { fuseMemoForwardRef } from "./lib/fuseMemoForwardRef";
import { createRef } from "./lib/recma/createRef";
import { recmaFixProperties } from "./lib/recma/fixProperties";
import { recmaRemoveRedundantFragment } from "./lib/recma/removeRedundantFragment";
import { recmaReplaceRefs } from "./lib/recma/replaceRefs";
import { rehypeStripSquashAttribute } from "./lib/rehype/stripSquashAttribute";
import { recmaWrapAsComponent } from "./lib/rehype/wrapAsComponent";
import type { RewriteComponentStrategy } from "./lib/rewriteComponent/types";
import type { FileSink } from "./lib/sinks/base";
import { buildAncestorsMap, visitComponent } from "./lib/visitComponent";
import { Metadata, type Snapshot } from "./types";

type Root = import("hast").Root;
type Element = import("hast").Element;
type NodeId = Metadata.ReactFiber.NodeId;
type CodeId = Metadata.ReactFiber.CodeId;
type ComponentId = Metadata.ReactFiber.ComponentId;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

async function writeFile(opts: {
  componentName: string;
  path: string;
  root: Root;
  sink: FileSink;
  componentRegistry: ComponentRegistry;
}) {
  const processor = unified()
    .use(rehypeStripSquashAttribute)
    .use(rehypeRecma)
    .use(recmaJsx)
    .use(recmaRemoveRedundantFragment)
    .use(recmaWrapAsComponent, opts.componentName)
    .use(recmaReplaceRefs, { componentRegistry: opts.componentRegistry })
    .use(recmaFixProperties)
    .use(recmaStringify);

  const estree = await processor.run(clone(opts.root));
  await opts.sink.writeText(
    opts.path,
    await prettier.ts(processor.stringify(estree))
  );
}

export const replicate = (
  snapshot: Snapshot,
  sink: FileSink<any>,
  rewriteComponentStrategy: RewriteComponentStrategy
) =>
  traceable(
    async (_url: string) => {
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

      const componentRegistry = buildInitialComponentRegistry(m.components);
      const codeIdToComponentId = new Map(
        comps
          .map((c) => ("codeId" in c ? ([c.codeId, c.id] as const) : undefined))
          .filter((v) => !!v)
      );

      const ancestorsMap = buildAncestorsMap(m.nodes);
      await unified()
        .use(rehypeParse, { fragment: true })
        .use(() => (tree: Root) => {
          return visitComponent(m, async (group) => {
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
                  const nodeId = element.properties?.[
                    "dataSquashNodeId"
                  ] as NodeId;
                  if (parent?.type !== "element" && parent?.type !== "root")
                    return;

                  if (ancestorsMap.get(nodeId)?.has(parentId)) {
                    elementsByNodeId.set(parentId, [
                      ...(elementsByNodeId.get(parentId) ?? []),
                      { element, index, parent, nodeId },
                    ]);
                    return SKIP;
                  }
                });
              }

              const resolved = componentRegistry.get(group.id)!;

              // The component never has a node, however it might still be called in some react element props somewhere
              if (!elementsByNodeId.size) {
                await sink.writeText(
                  resolved.path,
                  `export const ${resolved.name} = () => null;`
                );
                return;
              }

              const componentRegistryForRewrite: ComponentRegistry = new Map();
              for (const [id, c] of componentRegistry.entries()) {
                if (id === resolved.id) {
                  const name = "ComponentToRewrite";
                  componentRegistryForRewrite.set(id, {
                    ...c,
                    name: { value: name, isFallback: true },
                    module: `./${name}`,
                  });
                } else {
                  componentRegistryForRewrite.set(id, c);
                }
              }

              const rewritten = await rewriteComponentStrategy({
                component: {
                  id: resolved.id,
                  code: m.code[group.component.codeId]!,
                },
                instances: Object.entries(group.nodes).map(([nid, node]) => {
                  const nodeId = nid as NodeId;
                  const elements = (elementsByNodeId.get(nodeId) ?? []).map(
                    (e) => clone(e.element)
                  );
                  const ref = createRef({
                    componentId: resolved.id,
                    props: node.props as Record<string, unknown>,
                    ctx: {
                      deps: new Set(),
                      codeIdToComponentId,
                      componentRegistry: componentRegistryForRewrite,
                    },
                    children: [],
                  });
                  return { ref, children: elements };
                }),
                componentRegistry: componentRegistryForRewrite,
              });

              Object.assign(resolved, rewritten.registry);
              await sink.writeText(resolved.path, rewritten.code);

              const elementsOrderedByDepth = [...elementsByNodeId.entries()]
                .map(([nodeId, elements]) => ({ nodeId, elements }))
                .sort(
                  (a, b) =>
                    (ancestorsMap.get(b.nodeId)?.size ?? 0) -
                    (ancestorsMap.get(a.nodeId)?.size ?? 0)
                );

              // Note(fant): loop over elements in reverse, so that we replace the innermost elements first.
              // TODO: for testing, try saving all of these separately to see if it works
              for (const { nodeId, elements } of elementsOrderedByDepth) {
                if (!elements.length) continue;

                const { index, parent } = elements[0]!;
                const props = nodes.find((n) => n.id === nodeId)!
                  .props as Record<string, unknown>;
                // Note(fant): we need to Object.assign instead of replace because some
                // of the elements detected might point at the parent being replaced
                Object.assign(
                  parent.children[index]!,
                  createRef({
                    componentId: resolved.id,
                    props,
                    nodeId,
                    ctx: {
                      deps: new Set(),
                      codeIdToComponentId,
                      componentRegistry,
                    },
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
              await writeFile({
                componentName: "App",
                path: "src/App.tsx",
                root: clone(tree),
                sink,
                componentRegistry,
              });
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
    },
    { name: "Replicator", client: langsmith }
  )(snapshot.page.url);
