import { ChildProcess, spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { FileSystemSink } from "./lib/sinks/fs";
import { logFileTree } from "./logFileTree";
import { replicate } from "./replicate";
import type { Capture } from "./types";

const PATH_TO_CAPTURE = `./captures/google.json`;
const PATH_TO_TEMPLATE = `./captures/replicated`;

// const capture = await fs
//   .readFile(PATH_TO_CAPTURE, "utf-8")
//   .then(
//     (t) =>
//       JSON.parse(t) as {
//         captureData: {
//           css: string;
//           js: string;
//           headContent: string;
//           bodyContent: string;
//         };
//         currentUrl: string;
//         timestamp: string;
//         sessionId: string;
//       }
//   )
//   .then(
//     ({ captureData: d, currentUrl: url }): Capture => ({
//       pages: [
//         {
//           css: d.css,
//           js: d.js,
//           html: { head: d.headContent, body: d.bodyContent },
//           url,
//         },
//       ],
//     })
//   );
const capture = JSON.parse(
  await fs.readFile(PATH_TO_CAPTURE, "utf-8")
) as Capture;

await Promise.all(
  [
    path.join(PATH_TO_TEMPLATE, "src/components"),
    path.join(PATH_TO_TEMPLATE, "src/svgs"),
    path.join(PATH_TO_TEMPLATE, "public"),
  ].map((p) => fs.rm(p, { recursive: true }).catch(() => {}))
);

// const sink = new TarSink();
const sink = new FileSystemSink(PATH_TO_TEMPLATE);
await replicate(capture, sink, {
  // stylesAndScripts: false,
  // base64Images: false,
  // svgs: false,
  // buttons: false,
  // roles: false,
  // blocks: false,
  // tags: false,
});

// const out = await sink.finalize();
// await fs.writeFile("replicated.tar.gz", out);

await new Promise((resolve) => setTimeout(resolve, 10));
logFileTree(PATH_TO_TEMPLATE);

// Kill any existing pnpm dev process when this script restarts
let child: ChildProcess | null = null;

// Handle process cleanup on exit/restart
const cleanup = () => {
  if (child && !child.killed) {
    console.log("Killing existing pnpm dev process...");
    child.kill("SIGTERM");
    // Force kill after 5 seconds if it doesn't terminate gracefully
    setTimeout(() => {
      if (child && !child.killed) {
        child.kill("SIGKILL");
      }
    }, 5000);
  }
};

// Register cleanup handlers
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", cleanup);

child = spawn("pnpm", ["dev", "--clearScreen=false"], {
  stdio: "inherit",
  cwd: PATH_TO_TEMPLATE,
});

await new Promise<void>((resolve, reject) => {
  child!.on("error", reject);
  child!.on("exit", (code, signal) => {
    if (signal) {
      reject(new Error(`Process was killed with signal ${signal}`));
    } else if (code !== 0) {
      reject(new Error(`Process exited with code ${code}`));
    } else {
      resolve();
    }
  });
});
