import { requireActiveOrganization, requireAuth } from "@/auth/middleware";
import type { Database } from "@/database";
import * as schema from "@/database/schema";
import { zValidator } from "@hono/zod-validator";
import { replicate, TarSink } from "@hypershape-ai/replicator";
import type { AppType as ReplicatorGitSyncAppType } from "@hypershape-ai/replicator-git-sync";
import { Hono } from "hono";
import { hc } from "hono/client";
import { randomUUID } from "node:crypto";
import z from "zod";

export const replicatorRouter = new Hono<{
  Bindings: CloudflareBindings;
  Variables: { db: Database };
}>().post(
  "/",
  requireAuth,
  requireActiveOrganization,
  zValidator(
    "json",
    z.object({
      // TODO: thread id...
      pages: z.array(
        z.object({
          url: z.string().url(),
          js: z.string(),
          css: z.string(),
          html: z.object({ head: z.string(), body: z.string() }),
        })
      ),
    })
  ),
  async (c) => {
    const filePath = `replicator/${randomUUID()}.tar.gz`;
    const db = c.get("db");
    const organizationId = c.get("organizationId");

    // TODO: make sure user can create repo in this org

    const startedAt = Date.now();
    try {
      const sink = new TarSink();
      console.log("Replicating...", Date.now() - startedAt);
      await replicate(c.req.valid("json"), sink);

      console.log("Finalizing tar...", Date.now() - startedAt);
      const tar = await sink.finalize();

      console.log("Uploading tar to R2...", Date.now() - startedAt);
      const res = await c.env.R2_FILE_TRANSFER_BUCKET.put(filePath, tar);
      await c.env.R2_FILE_TRANSFER_BUCKET.put("test", "dayum...");
      console.log("PUT....", res);

      const api = hc<ReplicatorGitSyncAppType>(
        c.env.REPLICATOR_GIT_SYNC_API_URL
      );
      const authorization = `Bearer ${c.env.REPLICATOR_GIT_SYNC_API_SECRET}`;
      console.log("Creating repo...", Date.now() - startedAt);
      const git = await api.index
        .$post(
          {
            json: {
              source: { prefix: "templates/replicator-vite-js", tag: "v0.0.1" },
              tarFilePath: filePath,
              commitMessage: "Initial commit",
              author: { name: "Replicator", email: "replicator@hypershape.ai" },
            },
          },
          { headers: { authorization } }
        )
        .then((res) => res.json());
      console.log("wowza...", git);

      // TODO: generate repo summary and name

      // stuff to add to branch system message
      //   const data = { sha: currentSha, title, description };
      // await db
      //   .update(schema.message)
      //   .set({ parts: [{ type: "data-gitSha", data }] })
      //   .where(eq(schema.message.id, rootMessage.id));

      console.log("Inserting repo...", Date.now() - startedAt);
      const repo = await db
        .insert(schema.repo)
        .values({
          name: "TODO: gen...",
          url: git.remote,
          snapshot: {
            type: "docker",
            image: "registry.fly.dev/replicator-vite-js:0.0.1",
            port: 5173,
            entrypoint: "pnpm dev",
          },
          defaultBranch: git.branch,
          private: true,
          organizationId,
        })
        .returning()
        .then(([repo]) => repo!);

      return c.json({ repoId: repo.id });
    } finally {
      console.log("Deleting tar from R2...", Date.now() - startedAt);
      // await c.env.R2_FILE_TRANSFER_BUCKET.delete(filePath).catch((e) =>
      //   console.warn(
      //     "Failed to delete file in c.env.R2_FILE_TRANSFER_BUCKET",
      //     filePath,
      //     e
      //   )
      // );
      console.log("Done!", Date.now() - startedAt);
    }
  }
);
