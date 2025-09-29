import type { ChatMessage } from "@/agent/types";
import { requireActiveOrganization, requireAuth } from "@/auth/middleware";
import type { Database } from "@/database";
import * as schema from "@/database/schema";
import { loadBranchMessages } from "@/database/util/load-branch-messages";
import { logger } from "@/lib/logger";
import { resolveMessageThreadHistory } from "@/lib/resolveMessageThreadHistory";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import z from "zod";
import { zUserMessagePart } from "../zod";
import { requireRepoBranch } from "./middleware";

export const repoBranchesRouter = new Hono<{
  Bindings: CloudflareBindings;
  Variables: { db: Database };
}>()
  .use(requireAuth, requireActiveOrganization)
  .get("/", requireAuth, requireActiveOrganization, async (c) => {
    const user = c.get("user");
    const db = c.get("db");
    const organizationId = c.get("organizationId");

    const branches = await db
      .select({
        id: schema.repoBranch.id,
        title: schema.repoBranch.title,
        name: schema.repoBranch.name,
        imageUrl: schema.repoBranch.imageUrl,
        createdAt: schema.repoBranch.createdAt,
        updatedAt: schema.repoBranch.updatedAt,
        repo: { id: schema.repo.id, name: schema.repo.name },
        createdBy: {
          id: schema.user.id,
          name: schema.user.name,
          image: schema.user.image,
        },
      })
      .from(schema.repo)
      .innerJoin(
        schema.repoBranch,
        eq(schema.repo.id, schema.repoBranch.repoId)
      )
      .innerJoin(schema.user, eq(schema.repoBranch.createdBy, schema.user.id))
      .innerJoin(
        schema.member,
        eq(schema.repo.organizationId, schema.member.organizationId)
      )
      .where(
        and(
          eq(schema.repo.organizationId, organizationId),
          isNull(schema.repo.deletedAt),
          eq(schema.member.userId, user.id),
          isNull(schema.repoBranch.deletedAt)
        )
      )
      .orderBy(desc(schema.repoBranch.updatedAt));

    return c.json(branches);
  })
  .get(
    "/:branchId",
    zValidator("param", z.object({ branchId: z.uuid() })),
    requireRepoBranch,
    (c) => c.json(c.get("branch"))
  )
  .get(
    "/:branchId/messages",
    zValidator("param", z.object({ branchId: z.uuid() })),
    requireAuth,
    requireRepoBranch,
    async (c) => {
      const user = c.get("user");
      const { branchId } = c.req.valid("param");
      const messages = await loadBranchMessages(c.get("db"), branchId, user.id);

      if (!messages.length) return c.json({ error: "Project not found" }, 404);
      return c.json(
        messages
          .filter((m) => !!m.parentId)
          .map(
            (m): ChatMessage => ({
              id: m.id,
              role: m.role,
              parts: m.parts,
              metadata: {
                createdAt: m.createdAt.toISOString(),
                parentId: m.parentId!,
              },
            })
          )
      );
    }
  )
  .post(
    "/:branchId/messages",
    zValidator("param", z.object({ branchId: z.uuid() })),
    zValidator(
      "json",
      z.object({
        message: z.object({
          id: z.uuid(),
          parts: z.array(zUserMessagePart),
          parentId: z.uuid(),
        }),
      })
    ),
    requireAuth,
    requireRepoBranch,
    async (c) => {
      const body = c.req.valid("json");
      const params = c.req.valid("param");
      const user = c.get("user");
      const db = c.get("db");

      const allMessages = await loadBranchMessages(
        db,
        params.branchId,
        user.id
      );
      if (!allMessages.length) {
        logger.debug("No messages found in branch", {
          branchId: params.branchId,
        });
        return c.json({ error: "No messages found in branch" }, 400);
      }
      if (!allMessages.some((m) => m.id === body.message.parentId)) {
        logger.debug("Parent message not found in branch", {
          branchId: params.branchId,
          parentId: body.message.parentId,
        });
        return c.json({ error: "Parent message not found in branch" }, 400);
      }

      const threadId = allMessages[0]!.threadId;
      logger.info("Found messages in thread", {
        threadId,
        count: allMessages.length,
      });
      const messages = await (async () => {
        if (allMessages.some((m) => m.id === body.message.id)) {
          return resolveMessageThreadHistory(allMessages, body.message.id);
        } else {
          const { id, parts, parentId } = body.message;
          const [message] = await db
            .insert(schema.message)
            .values({
              id,
              role: "user",
              parts,
              threadId,
              parentId,
              createdBy: user.id,
            })
            .returning();
          return [
            ...resolveMessageThreadHistory(allMessages, parentId),
            { ...message!, parentId },
          ];
        }
      })();
      logger.debug("Resolved messages", {
        branchId: params.branchId,
        threadId,
        count: messages.length,
      });

      const sandbox = c.env.DAYTONA_SANDBOX_MANAGER.getByName(params.branchId);
      return sandbox.startAgent({
        messages,
        threadId,
        branchId: params.branchId,
      });
    }
  )
  .get(
    "/:branchId/messages/stream",
    zValidator("param", z.object({ branchId: z.uuid() })),
    requireAuth,
    requireRepoBranch,
    async (c) => {
      const params = c.req.valid("param");
      const sandbox = c.env.DAYTONA_SANDBOX_MANAGER.getByName(params.branchId);
      return sandbox.listenToAgent();
    }
  )
  .post(
    "/:branchId/preview",
    zValidator("param", z.object({ branchId: z.uuid() })),
    zValidator("json", z.object({ sha: z.string().optional() })),
    requireRepoBranch,
    async (c) => {
      const body = c.req.valid("json");
      const params = c.req.valid("param");
      const sandbox = c.env.DAYTONA_SANDBOX_MANAGER.getByName(params.branchId);

      const sha = await (async () => {
        if (body.sha && !(await sandbox.isAgentRunning())) {
          await sandbox.gitReset(body.sha, undefined);
          return body.sha;
        } else {
          return await sandbox.gitCurrentCommit(undefined);
        }
      })();

      return c.json({ sha, url: await sandbox.getPreviewUrl() });
    }
  )
  .get(
    "/:branchId/preview/stream",
    zValidator("param", z.object({ branchId: z.uuid() })),
    requireRepoBranch,
    async (c) => {
      const params = c.req.valid("param");
      const sandbox = c.env.DAYTONA_SANDBOX_MANAGER.getByName(params.branchId);
      await sandbox.start();
      return sandbox.listenToStart();
    }
  )
  .post(
    "/:branchId/messages/abort",
    zValidator("param", z.object({ branchId: z.uuid() })),
    requireAuth,
    async (c) => {
      const params = c.req.valid("param");
      const sandbox = c.env.DAYTONA_SANDBOX_MANAGER.getByName(params.branchId);
      await sandbox.stopAgent();
      return c.json({ success: true });
    }
  )
  .delete(
    "/:branchId",
    zValidator("param", z.object({ branchId: z.uuid() })),
    requireRepoBranch,
    async (c) => {
      const db = c.get("db");
      const branch = c.get("branch");
      const sandbox = c.env.DAYTONA_SANDBOX_MANAGER.getByName(branch.id);
      await sandbox.stopAgent();
      await sandbox.destroy();

      await db
        .update(schema.repoBranch)
        .set({ deletedAt: new Date() })
        .where(eq(schema.repoBranch.id, branch.id));

      return c.json({ success: true });
    }
  );
