import { requireActiveOrganization, requireAuth } from "@/auth/middleware";
import type { Database } from "@/database";
import * as schema from "@/database/schema";
import { zValidator } from "@hono/zod-validator";
import { replicate, TarSink } from "@hypershape-ai/replicator";
import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import z from "zod";

export const replicatorRouter = new Hono<{
  Bindings: CloudflareBindings;
  Variables: { db: Database };
}>().get(
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

    try {
      const sink = new TarSink();
      await replicate(c.req.valid("json"), sink);
      const tar = await sink.finalize();

      await c.env.R2_FILE_TRANSFER_BUCKET.put(filePath, tar);

      // TODO: generate repo summary and name
      // call the git service to create the repo

      const repo = await db
        .insert(schema.repo)
        .values({
          name: "TODO: gen...",
          url: `s3://${c.env.R2_REPOS_BUCKET_NAME}/${filePath}`,
          snapshot: {
            type: "docker",
            image: "registry.fly.dev/replicator-vite-js:0.0.1",
            port: 5173,
            entrypoint: "pnpm dev",
          },
          defaultBranch: "master",
          private: true,
          organizationId,
        })
        .returning()
        .then(([repo]) => repo!);

      return c.json({ repoId: repo.id });
    } finally {
      await c.env.R2_FILE_TRANSFER_BUCKET.delete(filePath).catch((e) =>
        console.warn(
          "Failed to delete file in c.env.R2_FILE_TRANSFER_BUCKET",
          filePath,
          e
        )
      );
    }
  }
);
