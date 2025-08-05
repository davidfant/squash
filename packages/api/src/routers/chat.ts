import type { ChatMessage } from "@/agent/types";
import { requireAuth } from "@/auth/middleware";
import type { Database } from "@/database";
import type { MessageUsage } from "@/database/schema";
import * as schema from "@/database/schema";
import { withCacheBreakpoints } from "@/lib/withCacheBreakpoints";
import { anthropic } from "@ai-sdk/anthropic";
import { zValidator } from "@hono/zod-validator";
import { convertToModelMessages, stepCountIs, streamText, tool } from "ai";
import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { randomUUID } from "node:crypto";
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
      and(eq(schema.repoBranch.id, branchId), eq(schema.member.userId, userId))
    )
    .orderBy(asc(schema.message.createdAt));

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
            metadata: { createdAt: m.createdAt },
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
        }),
      })
    ),
    requireAuth,
    async (c) => {
      const db = c.get("db");
      const body = c.req.valid("json");
      const params = c.req.valid("param");
      const user = c.get("user");

      const messages = await loadMessages(db, params.branchId, user.id);
      if (!messages.length) {
        return c.json({ error: "Message thread not found" }, 404);
      }
      const lastMessage = messages[messages.length - 1]!;
      const threadId = lastMessage.threadId;
      if (lastMessage.id !== body.message.id) {
        const [message] = await db
          .insert(schema.message)
          .values({
            id: body.message.id,
            role: "user",
            parts: body.message.parts,
            threadId,
          })
          .returning();
        messages.push(message!);
      }

      const result = streamText({
        // model: google("gemini-2.5-flash"),
        // model: anthropic("claude-3-5-haiku-20241022"),
        model: anthropic("claude-sonnet-4-20250514"),
        messages: [
          ...withCacheBreakpoints([
            {
              role: "system",
              content: "You are a helpful assistant.",
            },
          ]),
          {
            role: "system",
            content:
              "this is a more specific system message which could e.g. contain the ls",
          },
          ...withCacheBreakpoints(convertToModelMessages(messages), 3),
        ],
        tools: {
          getWeather: tool({
            description: "Get the weather for a location",
            inputSchema: z.object({ location: z.string() }),
            outputSchema: z.object({
              weather: z.string(),
              temperature: z.number(),
            }),
            execute: async ({ location }) => {
              return {
                weather: `Weather in ${location}: sunny, 72°F`,
                temperature: 72,
              };
            },
          }),
        },
        stopWhen: [stepCountIs(10)],
      });

      const usage: MessageUsage[] = [];
      return result.toUIMessageStreamResponse<ChatMessage>({
        originalMessages: messages,
        generateMessageId: randomUUID,
        onFinish: async ({ responseMessage }) => {
          console.log("usage...", usage);
          await db.insert(schema.message).values({
            id: responseMessage.id,
            role: responseMessage.role as "user" | "assistant",
            parts: responseMessage.parts,
            usage,
            threadId,
          });
        },
        messageMetadata(opts) {
          if (opts.part.type === "start") {
            return { createdAt: new Date().toISOString() };
          }
          if (opts.part.type === "finish-step") {
            usage.push({
              ...opts.part.usage,
              modelId: opts.part.response.modelId,
            });
          }
        },
      });
    }
  );
