import type { Database } from "@/database";
import type { MessageStatus } from "@/database/schema";
import * as schema from "@/database/schema";
import { createQualifyAgent } from "@/mastra/agents/qualify";
import { addPage } from "@/mastra/workflows/addPage";
import type { AnyMessage } from "@/types";
import { zValidator } from "@hono/zod-validator";
import { asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { randomUUID } from "node:crypto";
import { z } from "zod";

async function checkMessages(
  messages: Array<AnyMessage & { status: MessageStatus }>,
  input: z.infer<typeof zMessageInput> | undefined,
  threadId: string,
  db: Database
) {
  const last = messages.slice(-1)[0];
  if (!input && last?.status !== "pending") return undefined;

  await Promise.all([
    !!last &&
      db
        .update(schema.messages)
        .set({ status: "done" })
        .where(eq(schema.messages.id, last.id)),
    (async () => {
      if (input) {
        const message = await db
          .insert(schema.messages)
          .values({
            id: input.id,
            role: "user",
            content: input.content,
            threadId,
            status: "pending",
          })
          .returning()
          .then(([m]) => m!);
        messages.push({
          id: message.id,
          role: "user",
          content: input.content,
          status: message.status,
          createdAt: message.createdAt,
        });
      }
    })(),
  ]);
  return messages;
}

const zMessagePart = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({
    type: z.literal("image"),
    image: z.string(),
    mimeType: z.string().optional(),
  }),
  z.object({
    type: z.literal("file"),
    data: z.string(),
    filename: z.string().optional(),
    mimeType: z.string(),
  }),
]);

const zMessageInput = z.object({
  id: z.string(),
  content: zMessagePart.array().min(1),
});

export const threadsRouter = new Hono<{
  Bindings: CloudflareBindings;
  Variables: { db: Database };
}>()
  .get(
    "/:threadId/messages",
    zValidator("param", z.object({ threadId: z.string().uuid() })),
    async (c) => {
      const threadId = c.req.valid("param").threadId;
      const messages = await c
        .get("db")
        .select({
          id: schema.messages.id,
          role: schema.messages.role,
          content: schema.messages.content,
          status: schema.messages.status,
          createdAt: schema.messages.createdAt,
        })
        .from(schema.messages)
        .where(eq(schema.messages.threadId, threadId))
        .orderBy(asc(schema.messages.createdAt));

      return c.json(messages as (AnyMessage & { status: MessageStatus })[]);
    }
  )
  .post("/", zValidator("json", zMessagePart.array().min(1)), async (c) => {
    const ipAddress =
      c.req.header("cf-connecting-ip") ??
      c.req.header("x-forwarded-for") ??
      c.req.raw.headers.get("x-forwarded-for");
    const content = c.req.valid("json");
    const thread = await c
      .get("db")
      .insert(schema.messageThreads)
      .values({ ipAddress })
      .returning()
      .then(([thread]) => thread!);

    await c.get("db").insert(schema.messages).values({
      role: "user",
      content,
      threadId: thread.id,
      status: "pending",
    });

    return c.json(thread);
  })
  .get("/test", async (c) => {
    return streamSSE(c, async (stream) => {
      const s = await addPage([
        {
          id: "",
          role: "user",
          content: [{ type: "text", text: "help me create a landing page" }],
          createdAt: new Date().toISOString(),
        },
      ]);

      const usagePerMessage: Record<
        string,
        {
          modelId: string;
          promptTokens: number;
          completionTokens: number;
          totalTokens: number;
        }
      > = {};
      for await (const delta of s) {
        switch (delta.type) {
          case "error":
            await stream.writeSSE({
              event: "error",
              data: (delta.error as Error).message,
              id: c.get("requestId"),
            });
            break;
          // TODO: remove model metadata/prompts...
          // case "step-start":
          // case "finish":
          //   break;
          case "step-finish":
            usagePerMessage[delta.messageId] = {
              modelId: delta.response.modelId,
              ...delta.usage,
            };
          default:
            await stream.writeSSE({ data: JSON.stringify(delta) });
            break;
        }
      }

      // const response = await s.response;
      // await db.insert(schema.messages).values(
      //   response.messages.map((m, i) => ({
      //     id: m.id,
      //     role: m.role,
      //     content: m.content as AnyMessage["content"],
      //     threadId: thread.id,
      //     status: "done" as const,
      //     usage: usagePerMessage[m.id],
      //   }))
      // );

      // await stream.writeSSE({ event: "done", data: "" });
    });

    // // const add = createStep({
    // //   id: "add",
    // //   inputSchema: z.number(),
    // //   outputSchema: z.number(),
    // //   execute: async ({ inputData }) => inputData + 1,
    // // });

    // const addTool = createTool({
    //   id: "add",
    //   inputSchema: z.object({ number: z.number() }),
    //   outputSchema: z.object({ number: z.number() }),
    //   description: `Adds 1 to the input`,
    //   execute: async ({ context }) => {
    //     // Tool logic here (e.g., API call)
    //     console.log("Using tool to fetch weather information for", context);
    //     return { number: context.number + 1 }; // Example return
    //   },
    // });

    // const add = createStep(addTool);
    // // const add = createStep({
    // //   id: "add",
    // //   inputSchema: z.number(),
    // //   outputSchema: z.number(),
    // //   execute: async ({ inputData }) => inputData + 1,
    // // });

    // const add3 = createWorkflow({
    //   id: "add3",
    //   description: "Add 3",
    //   inputSchema: z.object({ number: z.number() }),
    //   outputSchema: z.object({ number: z.number() }),
    // })
    //   .then(add)
    //   .then(add)
    //   .then(add)
    //   .then(add)
    //   .then(add)
    //   .then(add)
    //   .then(add)
    //   // .then(createStep(
    //   //   new Agent({
    //   //     name: "Generate Registry Component Search Queries",
    //   //     instructions: `
    //   //     We are building a website. You have been given a conversation with a user and your goal is to generate search queries for the component registry that are relevant to the page the user is trying to add.
    //   //     `,
    //   //     model: google('gemini-2.5-flash'),
    //   //     tools: { searchComponents },
    //   //   })
    //   // ))
    //   .commit();

    // const run = await add3.createRunAsync();
    // const result = await run.stream({ inputData: { number: 1 } });
    // for await (const chunk of result.stream) {
    //   console.log(chunk);
    //   if (chunk.type === "step-start") {
    //   }
    // }
  })
  .post(
    "/:threadId",
    zValidator("param", z.object({ threadId: z.string().uuid() })),
    zValidator("json", z.object({ message: zMessageInput.optional() })),
    async (c) => {
      const body = c.req.valid("json");
      const db = c.get("db");
      const params = c.req.valid("param");
      const thread = await db.query.messageThreads.findFirst({
        where: eq(schema.messageThreads.id, params.threadId),
        with: { messages: { orderBy: asc(schema.messages.createdAt) } },
      });
      if (!thread) return c.json({ error: "Thread not found" }, 404);

      const messages = await checkMessages(
        thread.messages as (AnyMessage & { status: MessageStatus })[],
        body.message,
        thread.id,
        db
      );
      if (!messages) return c.text("", 200);

      const agent = createQualifyAgent(c.env.DATABASE_URL);

      return streamSSE(c, async (stream) => {
        const s = await agent.stream(messages, {
          providerOptions: {
            google: { thinkingConfig: { includeThoughts: true } },
          },
          experimental_generateMessageId: () => randomUUID(),
        });

        const usagePerMessage: Record<
          string,
          {
            modelId: string;
            promptTokens: number;
            completionTokens: number;
            totalTokens: number;
          }
        > = {};
        for await (const delta of s.fullStream) {
          switch (delta.type) {
            case "error":
              await stream.writeSSE({
                event: "error",
                data: (delta.error as Error).message,
                id: c.get("requestId"),
              });
              break;
            // TODO: remove model metadata/prompts...
            // case "step-start":
            // case "finish":
            //   break;
            case "step-finish":
              usagePerMessage[delta.messageId] = {
                modelId: delta.response.modelId,
                ...delta.usage,
              };
            default:
              await stream.writeSSE({ data: JSON.stringify(delta) });
              break;
          }
        }

        const response = await s.response;
        await db.insert(schema.messages).values(
          response.messages.map((m, i) => ({
            id: m.id,
            role: m.role,
            content: m.content as AnyMessage["content"],
            threadId: thread.id,
            status: "done" as const,
            usage: usagePerMessage[m.id],
          }))
        );

        // await stream.writeSSE({ event: "done", data: "" });
      });
    }
  );
