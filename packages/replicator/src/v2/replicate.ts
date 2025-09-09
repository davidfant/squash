import {
  analyzeComponent,
  type ComponentToAnalyze,
} from "@/lib/analyzeComponent";
import { clone } from "@/lib/clone";
import { logger } from "@/lib/logger";
import * as prettier from "@/lib/prettier";
import { recmaFixProperties } from "@/lib/recma/fixProperties";
import { recmaRemoveRedundantFragment } from "@/lib/recma/removeRedundantFragment";
import { recmaStripSquashAttribute } from "@/lib/recma/stripSquashAttribute";
import { recmaWrapAsComponent } from "@/lib/rehype/wrapAsComponent";
import { toPlain } from "@/lib/toPlain";
import { load } from "cheerio";
import { traceable } from "langsmith/traceable";
import path from "path";
import recmaJsx from "recma-jsx";
import recmaStringify from "recma-stringify";
import rehypeParse from "rehype-parse";
import rehypeRecma from "rehype-recma";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { langsmith } from "../lib/ai";
import { downloadRemoteUrl } from "../lib/assets/downloadRemoteAsset";
import { identifyUrlsToDownload } from "../lib/assets/identifyRemoveAssetsToDownload";
import { fuseMemoForwardRef } from "../lib/fuseMemoForwardRef";
import type { FileSink } from "../lib/sinks/base";
import { aliasSVGPaths, type DescribeSVGStrategy } from "../lib/svg/alias";
import { replaceSVGPathsInFiles } from "../lib/svg/replace";
import { Metadata, type Snapshot } from "../types";
import { recmaReplaceRefs } from "./ref";
import { rewrite } from "./rewrite/agent";
import { getPropFunctionsRequiredForRender } from "./rewrite/propFunctions";
import {
  buildState,
  type ComponentRegistryItem,
  type ReplicatorNodeStatus,
} from "./state";
import { structureComponents } from "./structure/agent";

type NodeId = Metadata.ReactFiber.NodeId;
type ComponentId = Metadata.ReactFiber.ComponentId;

const whitelist: Metadata.ReactFiber.ComponentId[] = [];
// whitelist.push("C32", "C15");
// whitelist.push("C58"); // avatar
// whitelist.push("C75", "C40");

const maxConcurrency = 30;
const maxComponents = 500;

export const replicate = (
  snapshot: Snapshot,
  sink: FileSink<any>,
  describeSVGStrategy: DescribeSVGStrategy
) =>
  traceable(
    async (_url: string) => {
      // const $ = load(snapshot.page.html, { xmlMode: true });
      const $ = load(
        // TODO: this might incorrectly match with other text
        snapshot.page.html.replace(/<(\/?)h([1-6])/gi, "<$1x-h$2")
      );

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

      const rootTree = unified()
        .use(rehypeParse, { fragment: true })
        .parse(body.html()!);
      visit(rootTree, "element", (n) => {
        if (n.tagName.startsWith("x-h")) n.tagName = n.tagName.slice(2);
      });
      const state = await buildState(m, clone(rootTree));

      const analyzed = await traceable(
        (components: Array<ComponentToAnalyze>) =>
          Promise.all(components.map(analyzeComponent)),
        { name: "Analyze All Components" }
      )(
        [...state.component.all]
          .map(([cid, c]) => {
            if (!("codeId" in c)) return;
            const code = state.code.get(c.codeId);
            if (!code) return;
            return { id: cid, code, name: state.component.name.get(cid) };
          })
          .filter((v) => !!v)
        // .slice(0, 3)
      );
      const componentAnalysis = new Map<ComponentId, (typeof analyzed)[number]>(
        analyzed.map((a) => [a.id, a])
      );

      analyzed
        .filter((a) => !!a.classes.length)
        .forEach((a) => {
          state.component.all.delete(a.id);
          state.component.nodes
            .get(a.id)
            ?.forEach((id) => state.node.all.delete(id));
        });

      // $("h1,h2,h3,h4,h5,h6").each((_, el) => {
      //   el.tagName = `x-h${el.tagName.slice(1)}`;
      // });a

      state.trees.set("App", rootTree);

      const rewrites: Map<
        ComponentId,
        Promise<{
          id: ComponentId;
          result: Awaited<ReturnType<typeof rewrite>>;
        }>
      > = new Map();

      const componentsByMaxDepth = [...state.component.all.entries()].sort(
        ([, a], [, b]) =>
          (state.component.maxDepth.get(b.id) ?? 0) -
          (state.component.maxDepth.get(a.id) ?? 0)
      );

      function isRewritable(componentId: ComponentId): {
        status: "blocked" | "never" | "yes";
        details: {
          statusesByNodeId: Map<
            NodeId,
            Partial<Record<ReplicatorNodeStatus, Set<ComponentId>>>
          >;
          propFunctionsByNodeId: Map<
            NodeId,
            Record<string, unknown[]> | undefined
          >;
        };
      } | null {
        const component = state.component.all.get(componentId);
        if (
          !component ||
          !("codeId" in component) ||
          rewrites.has(componentId) ||
          state.component.nodes
            .get(componentId)
            ?.every((n) => state.node.status.get(n) !== "pending")
        ) {
          return null;
        }
        if (whitelist.length && !whitelist.includes(componentId)) {
          return null;
        }

        const statusesByNodeId = new Map<
          NodeId,
          Partial<Record<ReplicatorNodeStatus, Set<ComponentId>>>
        >(
          // TODO: try seeing if we change this logic in the following way, if it unblocks the Row component: for each descendant from props, get all of its descendants from props, and so on, and all of those are deleted from the current node descendants
          state.component.nodes.get(componentId)?.map((nodeId) => {
            const descendants = new Set(state.node.descendants.all.get(nodeId));
            state.node.descendants.fromProps.get(nodeId)?.forEach((d) => {
              descendants.delete(d.nodeId);
              state.node.descendants.all
                .get(d.nodeId)
                ?.forEach((d) => descendants.delete(d));
            });
            descendants.forEach(
              (d) => !state.node.status.has(d) && descendants.delete(d)
            );

            const statuses: Partial<
              Record<ReplicatorNodeStatus, Set<ComponentId>>
            > = {};
            descendants.forEach((d) => {
              const status = state.node.status.get(d);
              const node = state.node.all.get(d);
              if (status && node) {
                if (!(status in statuses)) statuses[status] = new Set();
                statuses[status]!.add(node.componentId);
              }
            });

            return [nodeId, statuses] as const;
          })
        );

        const propFunctionsByNodeId: Map<
          NodeId,
          Record<string, unknown[]>
        > = new Map(
          (state.component.nodes.get(componentId) ?? [])
            .filter((nodeId) => state.node.descendants.all.get(nodeId)?.size)
            .map((nodeId) => {
              const node = state.node.all.get(nodeId);
              const fns = getPropFunctionsRequiredForRender(
                componentAnalysis.get(componentId)!,
                (node?.props ?? {}) as Record<string, unknown>
              );
              if (!Object.keys(fns).length) return undefined;
              return [nodeId, fns] as const;
            })
            .filter((v) => !!v)
        );

        // if (componentId === "C18") { // Row component
        //   console.log(statusesByNodeId);
        // }

        const isBlocked = [...statusesByNodeId].every(([, s]) => s.pending);
        const isNever = [...propFunctionsByNodeId.values()].some(
          (paths) => paths && Object.values(paths).length
        );
        const value = isNever ? "never" : isBlocked ? "blocked" : "yes";
        return {
          status: value,
          details: { statusesByNodeId, propFunctionsByNodeId },
        };
      }

      await traceable(
        async () => {
          function enqueue() {
            // TODO: reorder by max node depth
            for (const [componentId, component] of componentsByMaxDepth) {
              if (rewrites.size >= maxConcurrency) {
                logger.debug(
                  "Max concurrency reached, waiting for a rewrite to finish"
                );
                return;
              }
              if (
                state.component.registry.size + rewrites.size >=
                maxComponents
              ) {
                logger.debug(
                  "Max components reached, waiting for a rewrite to finish"
                );
                return;
              }

              const rewritable = isRewritable(componentId);
              switch (rewritable?.status) {
                case "blocked":
                  logger.debug("Waiting for blocking component", {
                    componentId,
                    details: toPlain(rewritable.details.statusesByNodeId),
                  });
                  break;
                case "never":
                  logger.debug("Skipping component with prop fns", {
                    componentId,
                    details: toPlain(rewritable.details.propFunctionsByNodeId),
                  });
                  state.component.nodes.get(componentId)?.forEach((nodeId) => {
                    state.node.status.set(nodeId, "skipped");
                  });
                  break;
                case "yes":
                  logger.info("Start rewriting component", {
                    componentId,
                    details: toPlain(rewritable.details),
                  });

                  const childLogger = logger.child({
                    name: `rewrite ${componentId}`,
                  });
                  const promise = traceable(
                    (id: ComponentId) => rewrite(id, state, childLogger),
                    { name: `Rewrite ${componentId}` }
                  )(componentId);
                  rewrites.set(
                    componentId,
                    promise.then((result) => ({ id: componentId, result }))
                  );
                  break;
              }
            }
          }

          enqueue();
          while (rewrites.size) {
            logger.info("Number of running rewrites", { count: rewrites.size });

            const rewrite = await Promise.race(rewrites.values());
            logger.info("Rewriting done", rewrite);
            rewrites.delete(rewrite.id);

            if (rewrite.result) {
              await sink.writeText(
                path.join(
                  "src",
                  rewrite.result.item.dir,
                  `${rewrite.result.item.name}.tsx`
                ),
                rewrite.result.item.code.ts
              );
            } else {
              state.component.nodes.get(rewrite.id)?.forEach((nodeId) => {
                state.node.status.set(nodeId, "skipped");
              });
            }

            // if (state.component.registry.size + rewrites.size < maxComponents) {
            enqueue();
            // }
          }
        },
        { name: "Rewrite components" }
      )();

      // whitelist.length = 0;
      // console.log(
      //   JSON.stringify(
      //     toPlain(
      //       Object.fromEntries(
      //         [...state.component.all.entries()]
      //           .map(([id, c]) => [id, isRewritable(id)])
      //           .filter(([_, can]) => !!can)
      //       )
      //     )
      //   )
      // );

      console.dir(
        [
          ...new Set(
            [...state.component.nodes.get("C75")!]
              .flatMap((n) => [...(state.node.descendants.all.get(n) ?? [])])
              .map((n) => state.node.all.get(n)?.componentId)
              .filter((c) => !!c)
              .concat("C75")
          ),
        ].map((componentId) => ({
          componentId,
          rewritable: isRewritable(componentId)?.status,
        })),
        { depth: null }
      );

      const processor = unified()
        // .use(rehypeStripSquashAttribute)
        .use(rehypeRecma)
        .use(recmaJsx)
        .use(recmaRemoveRedundantFragment)
        .use(recmaWrapAsComponent, "App")
        .use(recmaReplaceRefs, state)
        .use(recmaStripSquashAttribute)
        .use(recmaFixProperties)
        .use(recmaStringify);

      const apptsx = await processor.run(rootTree);

      const appItem: ComponentRegistryItem = {
        id: "C-1",
        dir: "",
        name: "App",
        description: "App",
        code: { ts: await prettier.ts(processor.stringify(apptsx)), dts: "" },
      };
      state.component.registry.set(appItem.id, appItem);

      await sink.writeText("src/App.tsx", appItem.code.ts);
      await traceable(
        () => structureComponents(new Set([appItem.id]), state, sink, logger),
        { name: "Structure components" }
      )();

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
