import { requireActiveOrganization, requireAuth } from "@/auth/middleware";
import type { Database } from "@/database";
import * as schema from "@/database/schema";
import { zValidator } from "@hono/zod-validator";
import type { Snapshot } from "@squash/replicator";
// import { replicate, TarSink } from "@squash/replicator";
import type { AppType as ReplicatorGitSyncAppType } from "@squash/replicator-git-sync";
import { Hono } from "hono";
import { hc } from "hono/client";
import { randomUUID } from "node:crypto";
import z from "zod";

export const replicatorRouter = new Hono<{
  Bindings: CloudflareBindings;
  Variables: { db: Database };
}>()
  .post(
    "/:sessionId/snapshot",
    zValidator("param", z.object({ sessionId: z.string() })),
    zValidator(
      "json",
      z.object({
        // TODO: thread id...
        page: z.object({ url: z.url(), title: z.string(), html: z.string() }),
        metadata: z
          .object({
            type: z.literal("react-fiber"),
            code: z.record(z.string(), z.string()),
            components: z.record(
              z.string(),
              z.object({
                tag: z.number(),
                name: z.string().optional(),
                codeId: z.string().optional(),
              })
            ),
            nodes: z.record(
              z.string(),
              z.object({
                parentId: z
                  .string()
                  .transform((id) => id as `N${number}`)
                  .nullable(),
                componentId: z.string().transform((id) => id as `C${number}`),
                props: z
                  .record(z.string(), z.unknown())
                  .or(z.string())
                  .nullable(),
              })
            ),
          })
          .nullable(),
      })
    ),
    requireAuth,
    async (c) => {
      const { sessionId } = c.req.valid("param");
      const body = c.req.valid("json") satisfies Snapshot;
      const user = c.get("user");
      const key = `${user.id}/${sessionId}/${Date.now()}.json`;

      try {
        await c.env.REPLICATOR_BUCKET.put(key, JSON.stringify(body), {
          httpMetadata: { contentType: "application/json" },
          customMetadata: {
            uploadedBy: user.id,
            uploadedAt: new Date().toISOString(),
          },
        });

        return c.json({ success: true, key });
      } catch (error) {
        console.error("Upload error:", error);
        return c.json({ success: false, error: "Failed to upload file" }, 500);
      }
    }
  )
  .post(
    "/:sessionId",
    zValidator("param", z.object({ sessionId: z.string() })),
    requireAuth,
    requireActiveOrganization,
    async (c) => {
      const { sessionId } = c.req.valid("param");
      const user = c.get("user");

      const objects = await c.env.REPLICATOR_BUCKET.list({
        prefix: `${user.id}/${sessionId}`,
      });

      const snapshots = await Promise.all(
        objects.objects.map(async (obj) =>
          c.env.REPLICATOR_BUCKET.get(obj.key).then((res) =>
            res?.json<Snapshot>()
          )
        )
      ).then((res) => res.filter((s) => !!s));
      if (!snapshots.length) {
        return c.json({ error: "No snapshots found" }, 404);
      }
      const snapshot = snapshots[0]!;

      const filePath = `replicator/${randomUUID()}.tar.gz`;
      const db = c.get("db");
      const organizationId = c.get("organizationId");
      const version = "v0.0.3";

      // TODO: make sure user can create repo in this org

      const startedAt = Date.now();
      try {
        const TarSink: any = null;
        const replicate: any = null;
        const sink = new TarSink();
        console.log("Replicating...", Date.now() - startedAt);
        await replicate(snapshot, sink);

        console.log("Finalizing tar...", Date.now() - startedAt);
        const tar = await sink.finalize();

        console.log("Uploading tar to R2...", Date.now() - startedAt);
        await c.env.R2_FILE_TRANSFER_BUCKET.put(filePath, tar);

        const api = hc<ReplicatorGitSyncAppType>(
          c.env.REPLICATOR_GIT_SYNC_API_URL
        );
        const authorization = `Bearer ${c.env.REPLICATOR_GIT_SYNC_API_SECRET}`;
        console.log("Creating repo...", Date.now() - startedAt);
        const git = await api.index
          .$post(
            {
              json: {
                source: {
                  prefix: "templates/replicator-vite-js",
                  tag: version,
                },
                tarFilePath: filePath,
                commitMessage: "Initial commit",
                author: { name: "Squash", email: "agent@squash.build" },
              },
            },
            { headers: { authorization } }
          )
          .then((res) => res.json());

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
              image: `registry.fly.io/squash-template:replicator-vite-js-${version}`,
              port: 5173,
              entrypoint: "pnpm dev --host 0.0.0.0 --port $PORT",
              workdir: "/root/repo",
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
        await c.env.R2_FILE_TRANSFER_BUCKET.delete(filePath).catch((e) =>
          console.warn(
            "Failed to delete file in c.env.R2_FILE_TRANSFER_BUCKET",
            filePath,
            e
          )
        );
        console.log("Done!", Date.now() - startedAt);
      }
    }
  );
