import { AwsClient } from "aws4fetch";
import { ChildProcess, spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { langsmith } from "./lib/ai";
import { rewriteComponentWithLLMStrategy } from "./lib/rewriteComponent/llm";
import { rewriteComponentUseFirstStrategy } from "./lib/rewriteComponent/useFirst";
import { FileSystemSink } from "./lib/sinks/fs";
import { logFileTree } from "./logFileTree";
import { replicate } from "./replicate";
import type { Snapshot } from "./types";

const SNAPSHOT_CACHE_DIR = path.join(os.tmpdir(), "squash-replicator");
const PATH_TO_TEMPLATE = `./playground`;

const snapshots: Record<string, string> = {
  cursor:
    "46cb2680-f22a-4656-a386-c535e1fe3808/0e7e720f-491f-442d-a9c6-bfcf60bde1ba/1756183558170.json",
  dework:
    "46cb2680-f22a-4656-a386-c535e1fe3808/4c751a7c-88e9-4aa7-8a7f-cc4affec16a5/1756321376209.json",
  autodesk:
    "46cb2680-f22a-4656-a386-c535e1fe3808/9c838fb6-6bd2-43bd-9dc5-df38ee3e4227/1756337260672.json",
};

const arg = process.argv[2];
if (!arg) throw new Error("No snapshot ID provided");

const snapshotId = snapshots[arg] ?? arg;
if (!snapshotId) throw new Error("Invalid snapshot ID");

const snapshotPath = path.join(SNAPSHOT_CACHE_DIR, snapshotId);
const snapshot = await (async (): Promise<Snapshot> => {
  if (await fs.stat(snapshotPath).catch(() => false)) {
    console.log("Using cached snapshot", snapshotPath);
  } else {
    console.log("Downloading snapshot", snapshotId);
    const url = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET_NAME}/${snapshotId}`;
    const signedUrl = await new AwsClient({
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      service: "s3",
      region: "auto",
    }).sign(url, { method: "GET", aws: { signQuery: true } });

    // fetch and save at snapshotPath
    await fs.mkdir(path.dirname(snapshotPath), { recursive: true });
    await fetch(signedUrl)
      .then((res) => res.json())
      .then((json) =>
        fs.writeFile(snapshotPath, JSON.stringify(json, null, 2))
      );
    console.log("Saved to", snapshotPath);
  }

  return fs.readFile(snapshotPath, "utf-8").then(JSON.parse);
})();

await Promise.all(
  [
    path.join(PATH_TO_TEMPLATE, "src/components"),
    path.join(PATH_TO_TEMPLATE, "src/svgs"),
    path.join(PATH_TO_TEMPLATE, "src/App.tsx"),
    path.join(PATH_TO_TEMPLATE, "public"),
  ].map((p) => fs.rm(p, { recursive: true }).catch(() => {}))
);

// const sink = new TarSink();
const sink = new FileSystemSink(PATH_TO_TEMPLATE);
try {
  await replicate(snapshot, sink, (opts) => {
    if (["C80", "C81"].includes(opts.component.id)) {
      return rewriteComponentWithLLMStrategy(opts);
    } else {
      return rewriteComponentUseFirstStrategy(opts);
    }
  });
} finally {
  await langsmith.awaitPendingTraceBatches();
}

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
