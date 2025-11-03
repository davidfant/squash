import type { ChatMessage } from "@/agent/types";
import type { Database } from "@/database";
import * as schema from "@/database/schema";
import { loadBranchMessages } from "@/database/util/load-branch-messages";
import { logger } from "@/lib/logger";
import { resolveMessageThreadHistory } from "@/lib/resolveMessageThreadHistory";
import { requireRepoBranch, requireRole } from "@/routers/util/auth-middleware";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import z from "zod";
import { zUserMessagePart } from "./util/zod";

export const repoBranchMessagesRouter = new Hono<{
  Bindings: CloudflareBindings;
  Variables: { db: Database };
}>()
  .use(requireRole("org:admin", "org:builder"), requireRepoBranch)
  .get(
    "/",
    zValidator("param", z.object({ branchId: z.uuid() })),
    async (c) => {
      const auth = c.get("auth");
      const { branchId } = c.req.valid("param");
      const messages = await loadBranchMessages(
        c.get("db"),
        branchId,
        auth.orgId!
      );

      if (!messages.length)
        return c.json({ error: "Branch messages not found" }, 404);
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
    "/",
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
      const auth = c.get("auth");
      const db = c.get("db");

      const allMessages = await loadBranchMessages(
        db,
        params.branchId,
        auth.orgId!
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

      const message = await db
        .insert(schema.message)
        .values({
          id: body.message.id,
          parts: body.message.parts,
          parentId: body.message.parentId,
          role: "user",
          threadId,
          createdBy: auth.userId!,
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

      const restoreVersion =
        allMessages.slice(-1)[0]?.id !== body.message.parentId;
      logger.info("Starting agent", {
        count: messages.length,
        branchId: params.branchId,
        threadId,
        restoreVersion,
      });
      await sandbox.startAgent({
        messages,
        threadId,
        branchId: params.branchId,
        restoreVersion,
      });
      return sandbox.listenToAgent();
    }
  )
  .get(
    "/stream",
    zValidator("param", z.object({ branchId: z.uuid() })),
    async (c) => {
      const params = c.req.valid("param");
      const sandbox = c.env.DAYTONA_SANDBOX_MANAGER.getByName(params.branchId);
      return sandbox.listenToAgent();
    }
  )

  .post(
    "/abort",
    zValidator("param", z.object({ branchId: z.uuid() })),
    async (c) => {
      const params = c.req.valid("param");
      const sandbox = c.env.DAYTONA_SANDBOX_MANAGER.getByName(params.branchId);
      await sandbox.stopAgent();
      return c.json({ success: true });
    }
  );
