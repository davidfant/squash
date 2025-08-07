import fs from "node:fs/promises";
import path from "path";
import prettier from "prettier";
import recmaJsx from "recma-jsx";
import recmaStringify from "recma-stringify";
import rehypeParse from "rehype-parse";
import rehypeRecma from "rehype-recma";
import rehypeRemoveComments from "rehype-remove-comments";
import { unified } from "unified";
import { recmaExtractJSXComponents } from "./lib/recmaExtractJSXComponents";
import { rehypeExtractLinks } from "./lib/rehypeExtractLinks";
import { rehypeExtractSVGs } from "./lib/rehypeExtractSVGs";
import type { Context, Stats } from "./types";

const PATH_TO_CAPTURE = "./captures/linklime.json";
const PATH_TO_TEMPLATE = "./template";

await fs
  .rmdir(path.join(PATH_TO_TEMPLATE, "src/components"), {
    recursive: true,
  })
  .catch(() => {});

const ctx: Context = {
  extractedLinks: [],
};
const stats: Stats = {
  svgs: { total: 0, unique: 0 },
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
  await prettier.format(capture.captureData.css, {
    parser: "css",
    tabWidth: 2,
    useTabs: false,
  })
);
await write(
  "public/script.js",
  await prettier.format(capture.captureData.js, {
    parser: "babel",
    tabWidth: 2,
    useTabs: false,
  })
);

const body = await unified()
  .use(rehypeParse, { fragment: true })
  .use(rehypeRemoveComments)
  .use(rehypeExtractLinks(ctx)) // Extract and remove <link> elements
  .use(rehypeExtractSVGs(PATH_TO_TEMPLATE)) // our plugin
  .use(rehypeRecma)
  // .use(rehypeStringify) // HAST → HTML
  .use(recmaJsx)
  .use(recmaExtractJSXComponents(stats)) // Extract JSX components and add imports
  .use(recmaStringify)
  .process(capture.captureData.bodyContent);

// console.log("damn...", body);

const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    ${capture.captureData.headContent}
    <link rel="stylesheet" href="/styles.css" />
    ${ctx.extractedLinks.join("\n    ")}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
    <script type="module" src="/script.js"></script>
  </body>
</html>
`.trim();
await write(
  "index.html",
  await prettier.format(html, {
    parser: "html",
    tabWidth: 2,
    useTabs: false,
    printWidth: 80,
    htmlWhitespaceSensitivity: "css",
  })
);

await write(
  "src/App.jsx",
  await prettier.format(String(body), {
    parser: "babel",
    tabWidth: 2,
    useTabs: false,
    printWidth: 80,
    htmlWhitespaceSensitivity: "css",
  })
);
