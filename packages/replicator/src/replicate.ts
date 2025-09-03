import * as prettier from "@/lib/prettier";
import { load } from "cheerio";
import { traceable } from "langsmith/traceable";
import * as path from "path";
import recmaJsx from "recma-jsx";
import recmaStringify from "recma-stringify";
import rehypeRecma from "rehype-recma";
import { unified } from "unified";
import { langsmith } from "./lib/ai";
import { downloadRemoteUrl } from "./lib/assets/downloadRemoteAsset";
import { identifyUrlsToDownload } from "./lib/assets/identifyRemoveAssetsToDownload";
import {
  buildInitialComponentRegistry,
  type ComponentRegistry,
} from "./lib/componentRegistry";
import { fuseMemoForwardRef } from "./lib/fuseMemoForwardRef";
import { recmaFixProperties } from "./lib/recma/fixProperties";
import { recmaRemoveRedundantFragment } from "./lib/recma/removeRedundantFragment";
import { recmaReplaceRefs } from "./lib/recma/replaceRefs";
import { rehypeStripSquashAttribute } from "./lib/rehype/stripSquashAttribute";
import { recmaWrapAsComponent } from "./lib/rehype/wrapAsComponent";
import { rewriteComponentWithLLM } from "./lib/rewriteComponent";
import type { RewriteComponentStrategy } from "./lib/rewriteComponent.old/types";
import type { FileSink } from "./lib/sinks/base";
import { aliasSVGPaths, type DescribeSVGStrategy } from "./lib/svg/alias";
import { replaceSVGPathsInFiles } from "./lib/svg/replace";
import { componentsMap, nodesMap } from "./lib/traversal/util";
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

      const rewritten = await traceable(
        (
          components: Array<{
            id: Metadata.ReactFiber.ComponentId;
            code: string;
            name: string | undefined;
          }>
        ) => Promise.all(components.map(rewriteComponentWithLLM)),
        { name: "Rewrite All Components" }
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

      rewritten.forEach((r) => {
        const item = registry.get(r.id)!;
        item.path = path.join(
          "src/components/rewritten",
          r.id,
          `${r.name}.tsx`
        );
        item.module = path.join("@/components/rewritten", r.id, r.name);
        item.code = r.typescript;
      });

      await Promise.all(
        rewritten.map((r) =>
          sink.writeText(registry.get(r.id)?.path!, r.typescript)
        )
      );

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
