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

const repoBranchRouter = new Hono<{
  Bindings: CloudflareBindings;
  Variables: { db: Database };
}>()
  .use(zValidator("param", z.object({ branchId: z.uuid() })), requireRepoBranch)
  .get("/", async (c) => c.json(c.get("branch")))
  .get(
    "/messages",
    zValidator("param", z.object({ branchId: z.uuid() })),
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
    "/messages",
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

      // const messages = await (async () => {
      //   if (allMessages.some((m) => m.id === body.message.id)) {
      //     return resolveMessageThreadHistory(allMessages, body.message.id);
      //   } else {
      //     const { id, parts, parentId } = body.message;
      //     const [message] = await db
      //       .insert(schema.message)
      //       .values({
      //         id,
      //         role: "user",
      //         parts,
      //         threadId,
      //         parentId,
      //         createdBy: user.id,
      //       })
      //       .returning();
      //     return [
      //       ...resolveMessageThreadHistory(allMessages, parentId),
      //       { ...message!, parentId },
      //     ];
      //   }
      // })();
      const message = await db
        .insert(schema.message)
        .values({
          id: body.message.id,
          parts: body.message.parts,
          parentId: body.message.parentId,
          role: "user",
          threadId,
          createdBy: user.id,
        })
        .returning()
        .then(([message]) => message);
      const messages = [
        ...resolveMessageThreadHistory(allMessages, body.message.parentId),
        { ...message!, parentId: body.message.parentId },
      ];
      logger.debug("Resolved messages", {
        branchId: params.branchId,
        threadId,
        count: messages.length,
      });

      const sandbox = c.env.DAYTONA_SANDBOX_MANAGER.getByName(params.branchId);

      await sandbox.startAgent({
        messages,
        threadId,
        branchId: params.branchId,
        restoreVersion: allMessages.slice(-1)[0]?.id !== body.message.parentId,
      });
      return sandbox.listenToAgent();
    }
  )
  .get(
    "/messages/stream",
    zValidator("param", z.object({ branchId: z.uuid() })),
    async (c) => {
      const params = c.req.valid("param");
      const sandbox = c.env.DAYTONA_SANDBOX_MANAGER.getByName(params.branchId);
      return sandbox.listenToAgent();
    }
  )
  .get(
    "/preview",
    zValidator("param", z.object({ branchId: z.uuid() })),
    requireRepoBranch,
    async (c) => {
      const params = c.req.valid("param");
      const sandbox = c.env.DAYTONA_SANDBOX_MANAGER.getByName(params.branchId);
      return c.json({ url: await sandbox.getPreviewUrl() });
    }
  )
  .post(
    "/preview/stream",
    zValidator("param", z.object({ branchId: z.uuid() })),
    async (c) => {
      const params = c.req.valid("param");
      const sandbox = c.env.DAYTONA_SANDBOX_MANAGER.getByName(params.branchId);
      await sandbox.start();
      return sandbox.listenToStart();
    }
  )
  .get(
    "/preview/version",
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
    "/preview/version",
    zValidator("param", z.object({ branchId: z.uuid() })),
    zValidator("json", z.object({ messageId: z.string() })),
    requireRepoBranch,
    async (c) => {
      const db = c.get("db");
      const user = c.get("user");
      const body = c.req.valid("json");
      const { branchId } = c.req.valid("param");
      const sandbox = c.env.DAYTONA_SANDBOX_MANAGER.getByName(branchId);

      const allMessages = await loadBranchMessages(db, branchId, user.id);
      const messages = resolveMessageThreadHistory(allMessages, body.messageId);

      await sandbox.restoreVersion(messages);
      return c.json({ success: true });
    }
  )
  .post(
    "/deploy",
    zValidator("param", z.object({ branchId: z.uuid() })),
    async (c) => {
      const params = c.req.valid("param");
      const sandbox = c.env.DAYTONA_SANDBOX_MANAGER.getByName(params.branchId);
      await sandbox.deploy();
      return sandbox.listenToDeploy();
    }
  )
  .delete(
    "/deploy",
    zValidator("param", z.object({ branchId: z.uuid() })),
    async (c) => {
      const db = c.get("db");
      const branch = c.get("branch");
      const params = c.req.valid("param");
      await Promise.all([
        branch.deployment &&
          c.env.DOMAIN_MAPPINGS.delete(new URL(branch.deployment.url).host),
        db
          .update(schema.repoBranch)
          .set({ deployment: null })
          .where(eq(schema.repoBranch.id, params.branchId)),
      ]);
      return c.json({ success: true });
    }
  )
  .post(
    "/messages/abort",
    zValidator("param", z.object({ branchId: z.uuid() })),
    async (c) => {
      const params = c.req.valid("param");
      const sandbox = c.env.DAYTONA_SANDBOX_MANAGER.getByName(params.branchId);
      await sandbox.stopAgent();
      return c.json({ success: true });
    }
  )
  .delete(
    "/",
    zValidator("param", z.object({ branchId: z.uuid() })),
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

export const repoBranchesRouter = new Hono<{
  Bindings: CloudflareBindings;
  Variables: { db: Database };
}>()
  .use(requireAuth, requireActiveOrganization)
  .get("/", async (c) => {
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
  .route("/:branchId", repoBranchRouter);
