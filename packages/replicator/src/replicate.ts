import path from "path";
import parserBabel from "prettier/plugins/babel";
import parserEstree from "prettier/plugins/estree";
import parserHtml from "prettier/plugins/html";
import parserCss from "prettier/plugins/postcss";
import prettier from "prettier/standalone";
import recmaJsx from "recma-jsx";
import recmaStringify from "recma-stringify";
import rehypeParse from "rehype-parse";
import rehypeRecma from "rehype-recma";
import rehypeRemoveComments from "rehype-remove-comments";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { recmaExtractJSXComponents } from "./lib/recmaExtractJSXComponents";
import { rehypeExtractBase64Images } from "./lib/rehype/extract/base64Images";
// import { rehypeExtractBlocks } from "./lib/rehypeExtractBlocks";
import { rehypeExtractBlocks } from "./lib/rehype/extract/blocks";
import { rehypeExtractBodyAttributes } from "./lib/rehype/extract/bodyAttributes";
import { rehypeExtractButtons } from "./lib/rehype/extract/buttons";
import { rehypeExtractLinksAndScripts } from "./lib/rehype/extract/linksAndScripts";
import { rehypeExtractRoles } from "./lib/rehype/extract/roles";
import { rehypeExtractSVGs } from "./lib/rehype/extract/svgs";
import { rehypeExtractTags } from "./lib/rehype/extract/tags";
import { rehypeIdentifyUrlsToDownload } from "./lib/rehype/identifyUrlsToDownload";
import type { FileSink } from "./lib/sinks/base";
import type { Capture, Context } from "./types";

export async function replicate(capture: Capture, sink: FileSink<any>) {
  const page = capture.pages[0]!;
  const ctx: Context = {
    tagsToMoveToHead: [],
    urlsToDownload: new Set(),
    bodyAttributes: {},
  };

  const [body, head] = await Promise.all([
    unified()
      .use(rehypeParse, { fragment: true })
      .use(rehypeRemoveComments)
      .use(rehypeExtractLinksAndScripts(ctx))
      .use(rehypeExtractBase64Images(sink))
      .use(rehypeExtractSVGs(sink))
      .use(rehypeExtractButtons(sink))
      .use(rehypeExtractRoles(sink))
      // .use(rehypeExtractNearDuplicateBlocks(PATH_TO_TEMPLATE, stats))
      .use(rehypeExtractBlocks(sink))
      .use(rehypeExtractTags(sink))
      .use(rehypeRecma)
      .use(recmaJsx)
      .use(recmaExtractJSXComponents)
      .use(recmaStringify)
      .process(page.html.body),

    unified()
      .use(rehypeParse, { fragment: false })
      .use(rehypeExtractBodyAttributes(ctx))
      .use(rehypeStringify)
      .process(page.html.body)
      .then(async () => {
        const head = await unified()
          .use(rehypeParse, { fragment: true })
          .use(rehypeRemoveComments)
          .use(rehypeIdentifyUrlsToDownload(ctx))
          .use(rehypeStringify)
          .process([page.html.head, ...ctx.tagsToMoveToHead].join("\n"));
        await Promise.all(
          Array.from(ctx.urlsToDownload).map(async (relativeUrl) => {
            const fullUrl = new URL(relativeUrl, page.url).href;
            const response = await fetch(fullUrl);
            if (!response.ok) {
              throw new Error(
                `Failed to download ${fullUrl}: ${response.status} ${response.statusText}`
              );
            }

            const buffer = Buffer.from(await response.arrayBuffer());
            await sink.writeBytes(path.join("public", relativeUrl), buffer);
          })
        );

        return head;
      }),
    prettier
      .format(page.css, { parser: "css", plugins: [parserCss] })
      .then((text) => sink.writeText("public/styles.css", text)),
    prettier
      .format(page.js, {
        parser: "babel",
        plugins: [parserBabel, parserEstree],
      })
      .then((text) => sink.writeText("public/script.js", text)),
  ]);

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        ${head}
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body ${Object.entries(ctx.bodyAttributes)
        .map(([key, value]) => `${key}="${value}"`)
        .join(" ")}>
      </body>
      <script type="module" src="/src/main.jsx"></script>
    </html>
    `.trim();
  // <script type="module" src="/script.js"></script>
  await Promise.all([
    prettier
      .format(html, { parser: "html", plugins: [parserHtml] })
      .then((text) => sink.writeText("index.html", text)),
    prettier
      .format(String(body), {
        parser: "babel",
        plugins: [parserBabel, parserEstree],
      })
      .then((text) => sink.writeText("src/App.jsx", text)),
  ]);
}
