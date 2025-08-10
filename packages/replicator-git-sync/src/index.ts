import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { serve } from "@hono/node-server";
import { zValidator } from "@hono/zod-validator";
import * as fs from "fs/promises";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { logger } from "hono/logger";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import simpleGit from "simple-git";
import * as tar from "tar";
import z from "zod";

const execFileAsync = promisify(execFile);

[
  "PORT",
  "AWS_ENDPOINT_URL_S3",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "REPOS_BUCKET_NAME",
  "FILE_TRANSFER_BUCKET_NAME",
  "API_SECRET",
].forEach((envVar) => {
  if (!process.env[envVar]) {
    throw new Error(`Required environment variable ${envVar} is not set`);
  }
});

const r2 = new S3Client({
  region: process.env.AWS_DEFAULT_REGION!,
  endpoint: process.env.AWS_ENDPOINT_URL_S3!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const REPOS_BUCKET = process.env.REPOS_BUCKET_NAME!;
const FILE_TRANSFER_BUCKET = process.env.FILE_TRANSFER_BUCKET_NAME!;
const API_SECRET = process.env.API_SECRET!;

const requireAuth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  const providedSecret = authHeader?.replace("Bearer ", "");
  if (providedSecret !== API_SECRET) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  await next();
});

export const app = new Hono().use("*", logger()).post(
  "/",
  requireAuth,
  zValidator(
    "json",
    z.object({
      source: z.object({ prefix: z.string(), tag: z.string() }),
      tarFilePath: z.string(),
      commitMessage: z.string(),
      author: z.object({ name: z.string(), email: z.string() }),
    })
  ),
  async (c) => {
    const body = c.req.valid("json");
    const targetPrefix = `replicator/${randomUUID()}`;
    const sourceGitOrigin = `s3://${REPOS_BUCKET}/${body.source.prefix}`;
    const targetGitOrigin = `s3://${REPOS_BUCKET}/${targetPrefix}`;

    const repoDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "replicator-git-sync-")
    );
    try {
      const git = simpleGit(repoDir);
      git.env({
        GIT_AUTHOR_NAME: body.author.name,
        GIT_AUTHOR_EMAIL: body.author.email,
        GIT_COMMITTER_NAME: body.author.name,
        GIT_COMMITTER_EMAIL: body.author.email,
      });

      console.log("Cloning repo", sourceGitOrigin, repoDir);
      await execFileAsync(
        "git",
        [
          "clone",
          "--depth",
          "1",
          "--branch",
          body.source.tag,
          sourceGitOrigin,
          ".",
        ],
        { cwd: repoDir, env: process.env }
      );

      console.log("Downloading tar file", body.tarFilePath);
      const command = new GetObjectCommand({
        Bucket: FILE_TRANSFER_BUCKET,
        Key: body.tarFilePath,
      });
      const response = await r2.send(command);
      if (!response.Body) throw new Error("Failed to download tar file");

      console.log("Extracting tar file", repoDir);
      await new Promise((resolve, reject) =>
        (response.Body as any)
          .pipe(tar.x({ cwd: repoDir, strip: 0 }))
          .on("error", reject)
          .on("close", resolve)
      );

      console.log("Committing changes", body.commitMessage);
      const branch = "master";
      const commit = await git.commit(body.commitMessage, ["./"]);
      await git.checkoutLocalBranch(branch);
      await git.raw(["remote", "set-url", "origin", targetGitOrigin]);
      console.log("Pushing changes to", targetGitOrigin);
      await execFileAsync("git", ["push", "origin", branch], {
        cwd: repoDir,
        env: process.env,
      });

      return c.json({ remote: targetGitOrigin, commit: commit.commit, branch });
    } catch (error) {
      console.error(error);
      return c.text(
        `Error: ${(error as Error).message}\n${(error as Error).stack}`,
        500
      );
    } finally {
      await fs.rm(repoDir, { recursive: true, force: true });
    }
  }
);

export type AppType = typeof app;

serve({ fetch: app.fetch, port: Number(process.env.PORT!) }, (info) =>
  console.log("Server started on port", info.port)
);
