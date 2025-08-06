import { streamAgent } from "@/agent/streamAgent";
import type { ChatMessage } from "@/agent/types";
import { requireAuth } from "@/auth/middleware";
import type { Database } from "@/database";
import type { MessageUsage } from "@/database/schema";
import * as schema from "@/database/schema";
import { resolveMessageThreadHistory } from "@/lib/resolveMessageThreadHistory";
import { zValidator } from "@hono/zod-validator";
import { and, asc, eq, isNull, not } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

export const zUserMessagePart = z.union([
  z.object({
    type: z.literal("text"),
    text: z.string(),
  }),
  z.object({
    type: z.literal("file"),
    mediaType: z.string(),
    filename: z.string().optional(),
    url: z.string(),
  }),
]);

const loadMessages = (db: Database, branchId: string, userId: string) =>
  db
    .select({
      id: schema.message.id,
      role: schema.message.role,
      parts: schema.message.parts,
      createdAt: schema.message.createdAt,
      threadId: schema.message.threadId,
      parentId: schema.message.parentId,
    })
    .from(schema.repoBranch)
    .innerJoin(
      schema.message,
      eq(schema.message.threadId, schema.repoBranch.threadId)
    )
    .innerJoin(schema.repo, eq(schema.repo.id, schema.repoBranch.repoId))
    .innerJoin(
      schema.member,
      eq(schema.repo.organizationId, schema.member.organizationId)
    )
    .where(
      and(
        eq(schema.repoBranch.id, branchId),
        eq(schema.member.userId, userId),
        // exclude the root message
        not(eq(schema.message.role, "system")),
        not(isNull(schema.message.parentId))
      )
    )
    .orderBy(asc(schema.message.createdAt))
    .then((msgs) => msgs.map((m) => ({ ...m, parentId: m.parentId! })));

export const chatRouter = new Hono<{
  Bindings: CloudflareBindings;
  Variables: { db: Database };
}>()
  .get(
    "/branches/:branchId",
    requireAuth,
    zValidator("param", z.object({ branchId: z.string().uuid() })),
    async (c) => {
      const user = c.get("user");
      const { branchId } = c.req.valid("param");
      const messages = await loadMessages(c.get("db"), branchId, user.id);

      if (!messages.length) return c.json({ error: "Project not found" }, 404);
      return c.json(
        messages.map(
          (m): ChatMessage => ({
            id: m.id,
            role: m.role,
            parts: m.parts,
            metadata: {
              createdAt: m.createdAt.toISOString(),
              parentId: m.parentId ?? undefined,
            },
          })
        )
      );
    }
  )
  .post(
    "/branches/:branchId",
    zValidator("param", z.object({ branchId: z.string().uuid() })),
    zValidator(
      "json",
      z.object({
        message: z.object({
          id: z.string().uuid(),
          parts: z.array(zUserMessagePart),
          parentId: z.string().uuid(),
        }),
      })
    ),
    requireAuth,
    async (c) => {
      const db = c.get("db");
      const body = c.req.valid("json");
      const params = c.req.valid("param");
      const user = c.get("user");

      const [allMessages, branch] = await Promise.all([
        loadMessages(db, params.branchId, user.id),
        db
          .select()
          .from(schema.repoBranch)
          .where(eq(schema.repoBranch.id, params.branchId))
          .then((r) => r[0]!),
      ]);
      if (!allMessages.length) {
        return c.json({ error: "Message thread not found" }, 404);
      }
      const threadId = allMessages[0]!.threadId;

      const messages = await (async () => {
        if (allMessages.some((m) => m.id === body.message.id)) {
          return resolveMessageThreadHistory(allMessages, body.message.id);
        } else {
          const { id, parts, parentId } = body.message;
          const [message] = await db
            .insert(schema.message)
            .values({ id, role: "user", parts, threadId, parentId })
            .returning();
          return [
            ...resolveMessageThreadHistory(allMessages, parentId),
            { ...message!, parentId },
          ];
        }
      })();

      const nextParentId = messages[messages.length - 1]!.id;

      const usage: MessageUsage[] = [];
      return streamAgent(
        messages,
        {
          type: "flyio",
          sandbox: {
            appId: branch.sandbox.appId,
            machineId: branch.sandbox.machineId,
            workdir: branch.sandbox.workdir,
            apiKey: c.env.FLY_API_KEY,
          },
        },
        {
          morphApiKey: c.env.MORPH_API_KEY,
          onFinish: async ({ responseMessage }) => {
            await db.insert(schema.message).values({
              id: responseMessage.id,
              role: responseMessage.role as "user" | "assistant",
              parts: responseMessage.parts,
              usage,
              threadId,
              parentId: nextParentId,
            });
          },
          messageMetadata(opts) {
            if (opts.part.type === "start") {
              return {
                createdAt: new Date().toISOString(),
                parentId: nextParentId,
              };
            }
            if (opts.part.type === "finish-step") {
              usage.push({
                ...opts.part.usage,
                modelId: opts.part.response.modelId,
              });
            }
          },
        }
      );
    }
  );
