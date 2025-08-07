import fs from "node:fs/promises";
import path from "path";
import prettier from "prettier";
import recmaJsx from "recma-jsx";
import recmaStringify from "recma-stringify";
import rehypeParse from "rehype-parse";
import rehypeRecma from "rehype-recma";
import rehypeRemoveComments from "rehype-remove-comments";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { recmaExtractJSXComponents } from "./lib/recmaExtractJSXComponents";
import { rehypeExtractBase64Images } from "./lib/rehypeExtractBase64Images";
import { rehypeExtractBodyAttributes } from "./lib/rehypeExtractBodyAttributes";
import { rehypeExtractLinksAndScripts } from "./lib/rehypeExtractLinksAndScripts";
import { rehypeExtractSVGs } from "./lib/rehypeExtractSVGs";
import { rehypeIdentifyRelativeDeps } from "./lib/rehypeIdentifyRelativeDeps";
import type { Context, Stats } from "./types";

const PATH_TO_CAPTURE = "./captures/linklime.json";
const PATH_TO_TEMPLATE = "./template";

// await Promise.all(
//   ["src/components", "public"].map((dir) =>
//     fs.rmdir(path.join(PATH_TO_TEMPLATE, dir), {
//       recursive: true,
//     })
//   )
// ).catch(() => {});
await fs.mkdir(path.join(PATH_TO_TEMPLATE, "public"), { recursive: true });

const ctx: Context = {
  tagsToMoveToHead: [],
  urlsToDownload: new Set(),
  bodyAttributes: {},
};
const stats: Stats = {
  svgs: { total: 0, unique: 0 },
  b64Images: { total: 0, unique: 0 },
};

const capture = JSON.parse(await fs.readFile(PATH_TO_CAPTURE, "utf-8")) as {
  captureData: {
    css: string;
    js: string;
    headContent: string;
    bodyContent: string;
  };
  currentUrl: string;
  timestamp: string;
  sessionId: string;
};

const write = (filePath: string, content: string) =>
  fs.writeFile(path.join(PATH_TO_TEMPLATE, filePath), content);

await write(
  "public/styles.css",
  await prettier.format(capture.captureData.css, { parser: "css" })
);
await write(
  "public/script.js",
  await prettier.format(capture.captureData.js, { parser: "babel" })
);

await unified()
  .use(rehypeParse, { fragment: false })
  .use(rehypeExtractBodyAttributes(ctx))
  .use(rehypeStringify)
  .process(capture.captureData.bodyContent);

const body = await unified()
  .use(rehypeParse, { fragment: true })
  .use(rehypeRemoveComments)
  .use(rehypeExtractLinksAndScripts(ctx))
  .use(rehypeExtractBase64Images(stats, PATH_TO_TEMPLATE))
  .use(rehypeExtractSVGs(PATH_TO_TEMPLATE))
  .use(rehypeRecma)
  .use(recmaJsx)
  .use(recmaExtractJSXComponents(stats)) // Extract JSX components and add imports
  .use(recmaStringify)
  .process(capture.captureData.bodyContent);

const head = await unified()
  .use(rehypeParse, { fragment: true })
  .use(rehypeRemoveComments)
  .use(rehypeIdentifyRelativeDeps(ctx))
  .use(rehypeStringify)
  .process(
    [capture.captureData.headContent, ...ctx.tagsToMoveToHead].join("\n")
  );

await Promise.all(
  Array.from(ctx.urlsToDownload).map(async (relativeUrl) => {
    const fullUrl = new URL(relativeUrl, capture.currentUrl).href;
    const response = await fetch(fullUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to download ${fullUrl}: ${response.status} ${response.statusText}`
      );
    }

    const filePath = path.join(PATH_TO_TEMPLATE, "public", relativeUrl);
    const parentDir = path.dirname(filePath);

    // Recursively create parent directories
    await fs.mkdir(parentDir, { recursive: true });

    // Download and save the file
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(filePath, buffer);
  })
);

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
  <script type="module" src="/script.js"></script>
</html>
`.trim();
await write("index.html", await prettier.format(html, { parser: "html" }));

await write(
  "src/App.jsx",
  await prettier.format(String(body), { parser: "babel" })
);

console.log(stats);
