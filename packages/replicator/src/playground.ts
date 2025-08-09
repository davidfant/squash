import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { FileSystemSink } from "./lib/sinks/fs";
import { logFileTree } from "./logFileTree";
import { replicate } from "./replicate";

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

// const sink = new TarSink();
const sink = new FileSystemSink(PATH_TO_TEMPLATE);
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
  sink
);

// const out = await sink.finalize();
// const file = createWriteStream("replicated.tar.gz");
// await out.pipeTo(Writable.toWeb(file));

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
