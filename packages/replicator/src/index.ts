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
import { rehypeExtractBase64Images } from "./lib/rehype/extract/base64Images";
// import { rehypeExtractBlocks } from "./lib/rehypeExtractBlocks";
import { rehypeExtractBlocks } from "./lib/rehype/extract/blocks";
import { rehypeExtractBodyAttributes } from "./lib/rehype/extract/bodyAttributes";
import { rehypeExtractButtons } from "./lib/rehype/extract/buttons";
import { rehypeExtractLinksAndScripts } from "./lib/rehype/extract/linksAndScripts";
import { rehypeExtractRoles } from "./lib/rehype/extract/roles";
import { rehypeExtractSVGs } from "./lib/rehype/extract/svgs";
import { rehypeExtractTags } from "./lib/rehype/extract/tags";
import { rehypeIdentifyRelativeDeps } from "./lib/rehype/identifyRelativeDeps";
import { logFileTree } from "./logFileTree";
import type { Context } from "./types";

// const PATH_TO_CAPTURE = "./captures/linklime.json";
const PATH_TO_CAPTURE = "./captures/posthog.json";
const PATH_TO_TEMPLATE = "./template";

await Promise.all(
  ["src/components", "public"].map((dir) =>
    fs.rmdir(path.join(PATH_TO_TEMPLATE, dir), { recursive: true })
  )
).catch(() => {});
await fs.mkdir(path.join(PATH_TO_TEMPLATE, "public"), { recursive: true });

const ctx: Context = {
  tagsToMoveToHead: [],
  urlsToDownload: new Set(),
  bodyAttributes: {},
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

async function write(filePath: string, content: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(path.join(PATH_TO_TEMPLATE, filePath), content);
}

await write(
  "public/styles.css",
  await prettier.format(capture.captureData.css, { parser: "css" })
);
// await write(
//   "public/script.js",
//   await prettier.format(capture.captureData.js, { parser: "babel" })
// );

await unified()
  .use(rehypeParse, { fragment: false })
  .use(rehypeExtractBodyAttributes(ctx))
  .use(rehypeStringify)
  .process(capture.captureData.bodyContent);

const body = await unified()
  .use(rehypeParse, { fragment: true })
  .use(rehypeRemoveComments)
  .use(rehypeExtractLinksAndScripts(ctx))
  .use(rehypeExtractBase64Images(PATH_TO_TEMPLATE))
  .use(rehypeExtractSVGs(PATH_TO_TEMPLATE))
  .use(rehypeExtractButtons(PATH_TO_TEMPLATE))
  .use(rehypeExtractRoles(PATH_TO_TEMPLATE))
  // .use(rehypeExtractNearDuplicateBlocks(PATH_TO_TEMPLATE, stats))
  .use(rehypeExtractBlocks(PATH_TO_TEMPLATE))
  .use(rehypeExtractTags(PATH_TO_TEMPLATE))
  .use(rehypeRecma)
  .use(recmaJsx)
  .use(recmaExtractJSXComponents) // Extract JSX components and add imports
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
  </html>
  `.trim();
// <script type="module" src="/script.js"></script>
await write("index.html", await prettier.format(html, { parser: "html" }));

await write(
  "src/App.jsx",
  await prettier.format(String(body), { parser: "babel" })
);

logFileTree(PATH_TO_TEMPLATE);
