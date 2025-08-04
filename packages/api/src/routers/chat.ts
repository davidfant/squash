import { requireAuth } from "@/auth/middleware";
import type { Database } from "@/database";
import type { MessageStatus } from "@/database/schema";
import * as schema from "@/database/schema";
import type { AnyMessage } from "@/types";
import { google } from "@ai-sdk/google";
import { zValidator } from "@hono/zod-validator";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import { z } from "zod";

export const chatRouter = new Hono<{
  Bindings: CloudflareBindings;
  Variables: { db: Database };
}>()
  .get(
    "/messages/threads/:threadId",
    zValidator("param", z.object({ threadId: z.string().uuid() })),
    async (c) => {
      const threadId = c.req.valid("param").threadId;
      const messages = await c
        .get("db")
        .select({
          id: schema.message.id,
          role: schema.message.role,
          content: schema.message.content,
          status: schema.message.status,
          createdAt: schema.message.createdAt,
        })
        .from(schema.message)
        .where(eq(schema.message.threadId, threadId))
        .orderBy(asc(schema.message.createdAt));

      return c.json(messages as (AnyMessage & { status: MessageStatus })[]);
    }
  )
  .get(
    "/messages/branches/:branchId",
    requireAuth,
    zValidator("param", z.object({ branchId: z.string().uuid() })),
    async (c) => {
      const user = c.get("user");
      const { branchId } = c.req.valid("param");
      const messages = await c
        .get("db")
        .select({
          id: schema.message.id,
          role: schema.message.role,
          content: schema.message.content,
          status: schema.message.status,
          createdAt: schema.message.createdAt,
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
            eq(schema.member.userId, user.id)
          )
        )
        .orderBy(asc(schema.message.createdAt));

      if (!messages.length) return c.json({ error: "Project not found" }, 404);
      return c.json(messages as (AnyMessage & { status: MessageStatus })[]);
    }
  )
  .post("", async (c) => {
    const { messages }: { messages: UIMessage[] } = await c.req.json();

    const result = streamText({
      model: google("gemini-2.5-flash"),
      system: "You are a helpful assistant.",
      messages: convertToModelMessages(messages),
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

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      generateMessageId: randomUUID,
      onFinish: ({ messages, responseMessage }) => {
        console.log(
          "ON FINISH...",
          JSON.stringify({ messages, responseMessage }, null, 2)
        );
      },
    });
  });
// .post(
//   "/projects/:projectId/page",
//   zValidator("param", z.object({ projectId: z.string().uuid() })),
//   zValidator("json", z.object({ message: zMessageInput.optional() })),
//   requireAuth,
//   requireProject,
//   async (c) => {
//     const project = c.get("project");
//     const daytona = c.get("daytona");
//     const db = c.get("db");
//     const body = c.req.valid("json");

//     const sandboxP = loadSandbox(daytona.sandboxId, c.env.DAYTONA_API_KEY);

//     const thread = await db.query.messageThreads.findFirst({
//       where: eq(schema.messageThreads.id, project.threadId),
//       with: { messages: { orderBy: asc(schema.messages.createdAt) } },
//     });
//     if (!thread) return c.json({ error: "Thread not found" }, 404);

//     const messages = await checkMessages(
//       thread.messages as (AnyMessage & { status: MessageStatus })[],
//       body.message,
//       thread.id,
//       db
//     );
//     if (!messages) return c.text("", 200);

//     const runtimeContext = new RuntimeContext([
//       ["daytona", { sandbox: await sandboxP, apiKey: c.env.DAYTONA_API_KEY }],
//       ["db", db],
//       ["projectId", project.id],
//     ]) satisfies RepoRuntimeContext;

//     return stream({
//       context: c,
//       db,
//       threadId: thread.id,
//       stream: addPage(messages, runtimeContext),
//     });
//   }
// );
