import type { Database } from "@/database";
import { loadBranchMessages } from "@/database/util/load-branch-messages";
import { logger } from "@/lib/logger";
import { resolveMessageThreadHistory } from "@/lib/resolveMessageThreadHistory";
import {
  requireAuth,
  requireRepoBranch,
  requireRole,
} from "@/routers/util/auth-middleware";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import mime from "mime/lite";
import z from "zod";

export const repoBranchPreviewRouter = new Hono<{
  Bindings: CloudflareBindings;
  Variables: { db: Database };
}>()
  .use(requireAuth, requireRole("org:admin", "org:builder"), requireRepoBranch)
  .get(
    "/",
    zValidator("param", z.object({ branchId: z.uuid() })),
    async (c) => {
      const params = c.req.valid("param");
      const sandbox = c.env.DAYTONA_SANDBOX_MANAGER.getByName(params.branchId);
      c.executionCtx.waitUntil(
        sandbox.waitUntilStarted().then(() => sandbox.keepAlive())
      );
      return c.json({ url: await sandbox.getPreviewUrl() });
    }
  )
  .post(
    "/stream",
    zValidator("param", z.object({ branchId: z.uuid() })),
    async (c) => {
      const params = c.req.valid("param");
      const sandbox = c.env.DAYTONA_SANDBOX_MANAGER.getByName(params.branchId);
      await sandbox.start();
      return sandbox.listenToStart();
    }
  )
  .get(
    "/logs",
    zValidator("param", z.object({ branchId: z.uuid() })),
    async (c) => {
      const params = c.req.valid("param");
      const sandbox = c.env.DAYTONA_SANDBOX_MANAGER.getByName(params.branchId);
      return sandbox.listenToLogs();
    }
  )
  .get(
    "/version",
    zValidator("param", z.object({ branchId: z.uuid() })),
    requireRepoBranch,
    async (c) => {
      const params = c.req.valid("param");
      const sandbox = c.env.DAYTONA_SANDBOX_MANAGER.getByName(params.branchId);
      const sha = await sandbox.gitCurrentCommit(undefined);
      return c.json({ sha });
    }
  )
  .put(
    "/version",
    zValidator("param", z.object({ branchId: z.uuid() })),
    zValidator("json", z.object({ messageId: z.string() })),
    requireRepoBranch,
    async (c) => {
      const db = c.get("db");
      const organizationId = c.get("organizationId");
      const body = c.req.valid("json");
      const { branchId } = c.req.valid("param");
      const sandbox = c.env.DAYTONA_SANDBOX_MANAGER.getByName(branchId);

      const stopAgentPromise = sandbox.stopAgent();

      const allMessages = await loadBranchMessages(
        db,
        branchId,
        organizationId
      );
      const messages = resolveMessageThreadHistory(allMessages, body.messageId);

      await stopAgentPromise;

      logger.info("Restoring version from API request");
      await sandbox.restoreVersion(messages);
      return c.json({ success: true });
    }
  )

  .get(
    "/fs",
    zValidator("param", z.object({ branchId: z.uuid() })),
    async (c) => {
      const { branchId } = c.req.valid("param");
      const sandbox = c.env.DAYTONA_SANDBOX_MANAGER.getByName(branchId);
      const files: string[] = await sandbox.listFiles();
      return c.json({ files });
    }
  )
  .get(
    "/fs/content",
    zValidator("param", z.object({ branchId: z.uuid() })),
    zValidator("query", z.object({ path: z.string().min(1) })),
    async (c) => {
      const { branchId } = c.req.valid("param");
      const { path: filePath } = c.req.valid("query");
      const sandbox = c.env.DAYTONA_SANDBOX_MANAGER.getByName(branchId);

      try {
        const file = await sandbox.readFile(filePath);
        const contentType =
          mime.getType(filePath) ?? "application/octet-stream";
        return c.body(file, 200, {
          "content-type": contentType,
          "x-filename": encodeURIComponent(filePath),
        });
      } catch (error) {
        logger.error("Failed to read file from sandbox", {
          branchId,
          path: filePath,
          error: {
            message: (error as Error).message,
            name: (error as Error).name,
            stack: (error as Error).stack,
          },
        });
        return c.json({ error: "Failed to read file" }, 400);
      }
    }
  );
