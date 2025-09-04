import * as prettier from "@/lib/prettier";
import { load } from "cheerio";
import { traceable } from "langsmith/traceable";
import path from "path";
import recmaJsx from "recma-jsx";
import recmaStringify from "recma-stringify";
import rehypeParse from "rehype-parse";
import rehypeRecma from "rehype-recma";
import { unified } from "unified";
import { SKIP, visit } from "unist-util-visit";
import { langsmith } from "./lib/ai";
import {
  analyzeComponent,
  type ComponentToAnalyze,
} from "./lib/analyzeComponent";
import { downloadRemoteUrl } from "./lib/assets/downloadRemoteAsset";
import { identifyUrlsToDownload } from "./lib/assets/identifyRemoveAssetsToDownload";
import {
  buildInitialComponentRegistry,
  type ComponentRegistry,
} from "./lib/componentRegistry";
import { fuseMemoForwardRef } from "./lib/fuseMemoForwardRef";
import {
  getRewritableComponents,
  type RewritableComponentInfo,
} from "./lib/getRewritableComponents";
import { createRef } from "./lib/recma/createRef";
import { recmaFixProperties } from "./lib/recma/fixProperties";
import { recmaRemoveRedundantFragment } from "./lib/recma/removeRedundantFragment";
import { recmaReplaceRefs } from "./lib/recma/replaceRefs";
import { rehypeStripSquashAttribute } from "./lib/rehype/stripSquashAttribute";
import { recmaWrapAsComponent } from "./lib/rehype/wrapAsComponent";
import type { RewriteComponentStrategy } from "./lib/rewriteComponent/types";
import type { FileSink } from "./lib/sinks/base";
import { aliasSVGPaths, type DescribeSVGStrategy } from "./lib/svg/alias";
import { replaceSVGPathsInFiles } from "./lib/svg/replace";
import {
  buildAncestorsMap,
  buildChildMap,
  buildComponentNodesMap,
  buildDescendantsMap,
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
      const componentNodes = buildComponentNodesMap(nodes);
      const childMap = buildChildMap(nodes);
      const ancestorsMap = buildAncestorsMap(nodes);
      const descendantsMap = buildDescendantsMap(childMap);
      const codeIdToComponentId = new Map(
        [...components.entries()]
          .map(([cid, c]) =>
            "codeId" in c ? ([c.codeId, cid] as const) : undefined
          )
          .filter((v) => !!v)
      );

      const nodeStatus = new Map<
        Metadata.ReactFiber.NodeId,
        "pending" | "valid" | "invalid"
      >(
        // [...nodes.entries()].map(([id, node]) => {
        //   const c = components.get(node.componentId);
        //   return [id, c && "codeId" in c ? "pending" : "valid"];
        // })
        [...nodes.entries()]
          .filter(([, n]) => {
            const c = components.get(n.componentId);
            return c && "codeId" in c;
          })
          .map(([id]) => [id, "pending"])
      );

      // mark every node that's not a code node as valid

      const formattedCode = new Map<Metadata.ReactFiber.CodeId, string>(
        await Promise.all(
          Object.entries(m.code).map(
            async ([id, code]) =>
              [
                id as Metadata.ReactFiber.CodeId,
                await prettier.js(`(${code})`),
              ] as const
          )
        )
      );
      const registry = buildInitialComponentRegistry(m.components);
      const tree = unified()
        .use(rehypeParse, { fragment: true })
        .parse(svgAliased.html);

      const analyzed = await traceable(
        (components: Array<ComponentToAnalyze>) =>
          Promise.all(components.map(analyzeComponent)),
        { name: "Analyze All Components" }
      )(
        [...registry.values()]
          .map((c) => {
            const comp = components.get(c.id);
            if (!comp || !("codeId" in comp)) return;
            const code = formattedCode.get(comp.codeId);
            if (!code) return;
            const n = c.name;
            return { id: c.id, code, name: n.isFallback ? undefined : n.value };
          })
          .filter((v) => !!v)
        // .slice(0, 3)
      );
      analyzed.forEach((a) => {
        const item = registry.get(a.id);
        if (!item) return;
        item.name = { value: a.name, isFallback: true };
        item.path = path.join("src/components/analyzed", a.id, `${a.name}.tsx`);
        item.module = path.join("@/components/analyzed", a.id, a.name);
      });
      console.dir(
        analyzed
          .map((a) => ({
            depCount: a.dependencies.length,
            nodeCount: componentNodes.get(a.id)!.length,
            ...a,
          }))
          .sort((a, b) => b.nodeCount - a.nodeCount),
        // .sort((a, b) => a.depCount - b.depCount),
        { depth: null }
      );

      let iteration = 0;
      while (true) {
        // if (Math.random()) break;
        if (iteration !== 0) break;

        const rewritable = getRewritableComponents(m, nodeStatus);
        console.dir(rewritable, { depth: null });
        const infos = [...rewritable.values()].filter((c) => c.rewritable);
        if (!infos.length) break;

        await traceable(
          (infos: RewritableComponentInfo[]) =>
            Promise.all(
              infos.map(async (a) => {
                const resolved = registry.get(a.componentId)!;
                // ["C36" as const, "C89" as const].map(async (componentId) => {
                //   const resolved = registry.get(componentId)!;
                const component = components.get(resolved.id)!;
                if (!("codeId" in component)) {
                  throw new Error(
                    "trying to rewrite component with no codeId: " + resolved.id
                  );
                }

                const elementsByNodeId = new Map<
                  NodeId,
                  Array<{
                    element: Element;
                    index: number;
                    parent: Root | Element;
                    nodeId: NodeId;
                  }>
                >();

                const nodeIdsForComponent = [...nodes.entries()]
                  .filter(([, n]) => n.componentId === resolved.id)
                  .map(([id]) => id);

                for (const parentId of nodeIdsForComponent) {
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

                // find all elements w this as a parent
                const rewritten = await traceable(
                  () =>
                    rewriteComponentStrategy({
                      component: {
                        id: resolved.id,
                        code: m.code[component.codeId]!,
                        deps: {
                          all: new Set(
                            [...registry.entries()]
                              .filter(([, c]) => c.code)
                              .map(([id]) => id)
                          ),
                          internal: new Set(),
                        },
                      },
                      instances: nodeIdsForComponent.map((nodeId) => {
                        const node = nodes.get(nodeId)!;
                        const nodeProps = clone(node.props) as Record<
                          string,
                          unknown
                        >;
                        const elements = (
                          elementsByNodeId.get(nodeId) ?? []
                        ).map((e) => clone(e.element));

                        // TODO: figure out how to replace nodes from props
                        // console.log("ELEMENTS");
                        // console.dir(elements, { depth: null });
                        // console.log("NODE PROPS");
                        // console.dir(nodeProps, { depth: null });

                        const ref = createRef({
                          componentId: resolved.id,
                          props: nodeProps,
                          ctx: {
                            deps: new Set(),
                            metadata: m,
                            tree,
                            codeIdToComponentId,
                            componentRegistry: registry,
                          },
                          children: [],
                        });

                        return { nodeId, ref, children: elements };
                      }),
                      componentRegistry: registry,
                      metadata: m,
                    }),
                  { name: `Rewrite ${resolved.name.value} (${resolved.id})` }
                )();
                if (!rewritten) {
                  nodeIdsForComponent.forEach((nodeId) =>
                    nodeStatus.set(nodeId, "invalid")
                  );
                  return null;
                } else {
                  Object.assign(resolved, rewritten);
                  await sink.writeText(resolved.path, rewritten.code!);
                  nodeIdsForComponent.forEach((nodeId) =>
                    nodeStatus.set(nodeId, "valid")
                  );
                }

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
                  if (!parent.children[index]!) return null;
                  Object.assign(
                    parent.children[index]!,
                    createRef({
                      componentId: resolved.id,
                      props,
                      nodeId,
                      ctx: {
                        deps: new Set(),
                        metadata: m,
                        tree,
                        codeIdToComponentId,
                        componentRegistry: registry,
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

                return rewritten;
              })
            ),
          {
            name: `Rewrite Components (iteration ${iteration}, ${infos.length} components)`,
          }
        )(infos);

        iteration++;
      }

      const processor = unified()
        .use(rehypeStripSquashAttribute)
        .use(rehypeRecma)
        .use(recmaJsx)
        .use(recmaRemoveRedundantFragment)
        .use(recmaWrapAsComponent, "App")
        .use(recmaReplaceRefs, registry)
        .use(recmaFixProperties)
        .use(recmaStringify);

      const appstx = await processor.run(tree);
      await sink.writeText(
        "src/App.tsx",
        await prettier.ts(processor.stringify(appstx))
      );

      // rewritten.forEach((r) => {
      //   const item = registry.get(r.id)!;
      //   item.path = path.join(
      //     "src/components/rewritten",
      //     r.id,
      //     `${r.name}.tsx`
      //   );
      //   item.module = path.join("@/components/rewritten", r.id, r.name);
      //   item.code = r.typescript;
      // });

      // await Promise.all(
      //   rewritten.map((r) =>
      //     sink.writeText(registry.get(r.id)?.path!, r.typescript)
      //   )
      // );

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
