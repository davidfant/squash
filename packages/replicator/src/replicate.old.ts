import * as prettier from "@/lib/prettier";
import { load } from "cheerio";
import { h } from "hastscript";
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
import { identifyChildrenFromProps } from "./lib/rewriteComponent/llm/identifyChildrenFromProps";
import type { RewriteComponentStrategy } from "./lib/rewriteComponent/types";
import type { FileSink } from "./lib/sinks/base";
import { aliasSVGPaths, type DescribeSVGStrategy } from "./lib/svg/alias";
import { replaceSVGPathsInFiles } from "./lib/svg/replace";
import { traverseComponents } from "./lib/traversal/components";
import {
  buildAncestorsMap,
  componentsMap,
  nodesMap,
} from "./lib/traversal/util";
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
    .use(recmaReplaceRefs, opts.componentRegistry)
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
  rewriteComponentStrategy: RewriteComponentStrategy,
  describeSVGStrategy: DescribeSVGStrategy
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

      const svgAliased = await traceable(
        () => aliasSVGPaths($, snapshot.metadata, describeSVGStrategy),
        { name: "Alias SVG paths" }
      )();

      const m = svgAliased.metadata;
      if (!m) throw new Error("Metadata is required");
      fuseMemoForwardRef(m);

      const nodes = nodesMap(m.nodes);
      const components = componentsMap(m.components);

      const componentRegistry = buildInitialComponentRegistry(m.components);
      const codeIdToComponentId = new Map(
        [...components.entries()]
          .map(([cid, c]) =>
            "codeId" in c ? ([c.codeId, cid] as const) : undefined
          )
          .filter((v) => !!v)
      );

      const ancestorsMap = buildAncestorsMap(nodesMap(m.nodes));
      await unified()
        .use(rehypeParse, { fragment: true })
        .use(() => (tree: Root) => {
          return traverseComponents(m, async (group) => {
            if ("codeId" in group.component) {
              const component = group.component;
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
              // if (!elementsByNodeId.size) {
              //   const code = `export const ${resolved.name.value} = () => null;`;
              //   Object.assign(resolved, { code });
              //   await sink.writeText(resolved.path,
              //     code
              //   );
              //   return;
              // }

              // console.log("DATUYM", resolved.id, {
              //   internal: group.deps.internal.size,
              //   all: group.deps.all.size,
              // });

              console.log("✅ REWRITING", group.id);

              const rewritten = await traceable(
                () =>
                  rewriteComponentStrategy({
                    component: {
                      id: resolved.id,
                      code: m.code[component.codeId]!,
                      deps: group.deps,
                    },
                    instances: Object.entries(group.nodes).map(
                      ([nid, node]) => {
                        const nodeId = nid as NodeId;
                        const nodeProps = clone(node.props) as Record<
                          string,
                          unknown
                        >;
                        const elements = (
                          elementsByNodeId.get(nodeId) ?? []
                        ).map((e) => clone(e.element));

                        // if (nodeId === "N1011") {
                        console.log("🔥🔥🔥🔥🔥🔥 children");
                        const identified = identifyChildrenFromProps(nodeId, m);
                        console.log("ID", identified);
                        visit(
                          { type: "root", children: elements },
                          "element",
                          (e, index, parent) => {
                            const nodeId = e.properties?.dataSquashNodeId;
                            if (!nodeId) return;

                            const i = identified.find(
                              (i) => i.nodeId === nodeId
                            );
                            if (parent && i) {
                              const last = i.key
                                .slice(0, -1)
                                .reduce((acc, k) => acc[k], nodeProps as any);
                              // TODO: this shouldn't happen... but does when e.g. going into children.props.children
                              if (last === undefined) return;

                              parent.children[index!] = h("placeholder", {
                                path: i.key.join("/"),
                              });
                              const tag: Metadata.ReactFiber.PropValue.Tag = {
                                $$typeof: "react.tag",
                                tagName: "placeholder",
                                props: { path: i.key.join("/") },
                              };
                              console.log("👀 replacing", {
                                nodeId,
                                i,
                                parent,
                                last,
                              });
                              last[i.key[i.key.length - 1]!] = tag;
                              // last[i.key[i.key.length - 1]!] =
                              //   "[[redacted, this string serves as a placeholder and will be seen as a <prop path=... /> tag in the output HTML]]";
                              // last[i.key[i.key.length - 1]!] =
                              //   "[[redacted, this string serves as a placeholder and will be seen as a <prop path=... /> tag in the output HTML]]";

                              return SKIP;
                            }
                          }
                        );

                        // console.log("elements");
                        // console.dir(elements, { depth: null });
                        // throw new Error("stop");
                        // }

                        const ref = createRef({
                          componentId: resolved.id,
                          props: nodeProps,
                          ctx: {
                            deps: new Set(),
                            codeIdToComponentId,
                            componentRegistry,
                          },
                          children: [],
                        });

                        return { nodeId, ref, children: elements };
                      }
                    ),
                    componentRegistry,
                    metadata: m,
                  }),
                { name: `Rewrite ${resolved.name.value} (${resolved.id})` }
              )();

              Object.assign(resolved, rewritten);
              await sink.writeText(resolved.path, rewritten!.code!);

              // if (group.id === "C23") throw new Error("done...");

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
                const props = nodes.get(nodeId)!.props as Record<
                  string,
                  unknown
                >;
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
        .process(svgAliased.html);

      const replicatedHtml = `
<!DOCTYPE html>
<html ${htmlAttrs.map((a) => `${a.name}="${a.value}"`).join(" ")}>
  <head>${head.html() ?? ""}</head>
  <body ${bodyAttrs.map((a) => `${a.name}="${a.value}"`).join(" ")}>
  </body>
  <script type="module" src="/src/main.tsx"></script>
</html>
  `.trim();
      await replaceSVGPathsInFiles(sink, svgAliased.dPathMapping);
      await prettier
        .html(replicatedHtml)
        .then((text) => sink.writeText("index.html", text));

      await urlsToDownloadP;
    },
    { name: "Replicator", client: langsmith }
  )(snapshot.page.url);
