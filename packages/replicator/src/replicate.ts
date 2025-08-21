import * as prettier from "@/lib/prettier";
import { JSDOM } from "jsdom";
// import { rehypeExtractBlocks } from "./lib/rehypeExtractBlocks";
import type { FileSink } from "./lib/sinks/base";
import type { Snapshot } from "./types";

const noop = () => () => {};

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

  const {
    window: { document: doc },
  } = new JSDOM(snapshot.page.html);

  // 1. get all attributes on the HTML and body tags
  const html = doc.querySelector("html") ?? doc.createElement("html");
  const head = doc.querySelector("head") ?? doc.createElement("head");
  const body = doc.querySelector("body") ?? doc.createElement("body");
  const htmlAttrs = Array.from(html.attributes);
  const bodyAttrs = Array.from(body.attributes);

  const blacklistedScriptTypes = ["application/json", "application/ld+json"];
  Array.from(doc.querySelectorAll("script"))
    .filter((s) => blacklistedScriptTypes.includes(s.type))
    .forEach((s) => s.remove());

  Array.from(body.querySelectorAll("link,style,script")).forEach((tag) => {
    body.removeChild(tag);
    head.appendChild(tag);
  });

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
  <head>${head.innerHTML}</head>
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
