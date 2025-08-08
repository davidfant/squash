import { spawn } from "node:child_process";
import fs from "node:fs/promises";
// import { rehypeExtractBlocks } from "./lib/rehypeExtractBlocks";
import { replicate } from ".";
import { FileSystemSink } from "./lib/sinks/fs";
import { logFileTree } from "./logFileTree";

const TEMPLATE_NAME = "posthog";
const PATH_TO_CAPTURE = `./captures/${TEMPLATE_NAME}.json`;
const PATH_TO_TEMPLATE = `./captures/replicated/${TEMPLATE_NAME}`;

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

await replicate(
  {
    pages: [
      {
        css: capture.captureData.css,
        js: capture.captureData.js,
        html: {
          head: capture.captureData.headContent,
          body: capture.captureData.bodyContent,
        },
        url: capture.currentUrl,
      },
    ],
  },
  new FileSystemSink(PATH_TO_TEMPLATE)
);

logFileTree(PATH_TO_TEMPLATE);

const child = spawn("pnpm", ["dev"], {
  stdio: "inherit",
  cwd: PATH_TO_TEMPLATE,
});

await new Promise<void>((resolve, reject) => {
  child.on("error", reject);
  child.on("exit", (code, signal) => {
    if (signal) {
      reject(new Error(`Process was killed with signal ${signal}`));
    } else if (code !== 0) {
      reject(new Error(`Process exited with code ${code}`));
    } else {
      resolve();
    }
  });
});
