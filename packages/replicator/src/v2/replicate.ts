import { logger } from "@/lib/logger";
import * as prettier from "@/lib/prettier";
import { recmaFixProperties } from "@/lib/recma/fixProperties";
import { recmaRemoveRedundantFragment } from "@/lib/recma/removeRedundantFragment";
import { recmaStripSquashAttribute } from "@/lib/recma/stripSquashAttribute";
import { recmaWrapAsComponent } from "@/lib/rehype/wrapAsComponent";
import { load } from "cheerio";
import { traceable } from "langsmith/traceable";
import path from "path";
import recmaJsx from "recma-jsx";
import recmaStringify from "recma-stringify";
import rehypeRecma from "rehype-recma";
import { unified } from "unified";
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
import { buildState, type ReplicatorNodeStatus } from "./state";

type NodeId = Metadata.ReactFiber.NodeId;
type ComponentId = Metadata.ReactFiber.ComponentId;

export const replicate = (
  snapshot: Snapshot,
  sink: FileSink<any>,
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

      const state = await buildState(svgAliased.html, m);
      const rewrites: Map<
        ComponentId,
        Promise<{
          id: ComponentId;
          result: Awaited<ReturnType<typeof rewrite>>;
        }>
      > = new Map();

      await traceable(
        async () => {
          const maxConcurrency = 1;
          function enqueue() {
            for (const [componentId, component] of [
              ...state.component.all,
            ].reverse()) {
              if (rewrites.size >= maxConcurrency) {
                logger.debug(
                  "Max concurrency reached, waiting for a rewrite to finish"
                );
                return;
              }

              if (!("codeId" in component)) continue;
              if (rewrites.has(componentId)) continue;
              if (
                state.component.nodes
                  .get(componentId)
                  ?.every((n) => state.node.status.get(n) === "valid")
              )
                continue;

              const statusesByNodeId = new Map<
                NodeId,
                Record<ReplicatorNodeStatus, number>
              >(
                // TODO: try seeing if we change this logic in the following way, if it unblocks the Row component: for each descendant from props, get all of its descendants from props, and so on, and all of those are deleted from the current node descendants
                state.component.nodes.get(componentId)?.map((nodeId) => {
                  const descendants = new Set(
                    state.node.descendants.all.get(nodeId)
                  );
                  state.node.descendants.fromProps.get(nodeId)?.forEach((d) => {
                    descendants.delete(d.nodeId);
                    state.node.descendants.all
                      .get(d.nodeId)
                      ?.forEach((d) => descendants.delete(d));
                  });
                  descendants.forEach(
                    (d) => !state.node.status.has(d) && descendants.delete(d)
                  );

                  const statuses = { pending: 0, valid: 0, invalid: 0 };
                  descendants.forEach((d) => {
                    const status = state.node.status.get(d);
                    if (status) statuses[status]++;
                  });

                  return [nodeId, statuses] as const;
                })
              );

              // if (componentId === "C18") { // Row component
              //   console.log(statusesByNodeId);
              // }

              const canRewrite = [...statusesByNodeId].every(
                ([, statuses]) =>
                  statuses.pending === 0 && statuses.invalid === 0
              );
              if (canRewrite) {
                // if (componentId === "C89") {
                // Card
                logger.info("Start rewriting component", {
                  componentId,
                  nodes: Object.fromEntries(statusesByNodeId.entries()),
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
                // }
              } else {
                logger.debug("Cannot rewrite component", {
                  componentId,
                  nodes: Object.fromEntries(statusesByNodeId.entries()),
                });
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
                rewrite.result.item.code
              );
            } else {
              state.component.nodes.get(rewrite.id)?.forEach((nodeId) => {
                state.node.status.set(nodeId, "invalid");
              });
            }

            // break;
            if (state.component.registry.size < 2) {
              enqueue();
            }
          }
        },
        { name: "Rewrite components" }
      )();

      const hostRoot = [...state.node.all.values()].find(
        (n) =>
          state.component.all.get(n.componentId)?.tag ===
          Metadata.ReactFiber.Component.Tag.HostRoot
      );
      if (hostRoot) {
        const tree = state.node.trees.get("App");
        if (tree) {
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

          const appstx = await processor.run(tree);
          await sink.writeText(
            "src/App.tsx",
            await prettier.ts(processor.stringify(appstx))
          );
        }
      }

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
