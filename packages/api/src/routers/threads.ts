import type { Database } from "@/database";
import type { MessageStatus } from "@/database/schema";
import * as schema from "@/database/schema";
import type { AnyMessage } from "@/types";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

export async function checkMessages(
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
        .update(schema.message)
        .set({ status: "done" })
        .where(eq(schema.message.id, last.id)),
    (async () => {
      if (input) {
        const message = await db
          .insert(schema.message)
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

export const zMessageInput = z.object({
  id: z.string(),
  content: zMessagePart.array().min(1),
});

export const threadsRouter = new Hono<{
  Bindings: CloudflareBindings;
  Variables: { db: Database };
}>().post("/", zValidator("json", zMessagePart.array().min(1)), async (c) => {
  const ipAddress =
    c.req.header("cf-connecting-ip") ??
    c.req.header("x-forwarded-for") ??
    c.req.raw.headers.get("x-forwarded-for");
  const content = c.req.valid("json");
  const thread = await c
    .get("db")
    .insert(schema.messageThread)
    .values({ ipAddress })
    .returning()
    .then(([thread]) => thread!);

  await c.get("db").insert(schema.message).values({
    role: "user",
    content,
    threadId: thread.id,
    status: "pending",
  });

  return c.json(thread);
});
// .post(
//   "/:threadId",
//   zValidator("param", z.object({ threadId: z.string().uuid() })),
//   zValidator("json", z.object({ message: zMessageInput.optional() })),
//   async (c) => {
//     const body = c.req.valid("json");
//     const db = c.get("db");
//     const params = c.req.valid("param");
//     const thread = await db.query.messageThreads.findFirst({
//       where: eq(schema.messageThreads.id, params.threadId),
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

//     return stream({
//       context: c,
//       db,
//       threadId: thread.id,
//       stream: addPage(messages),
//     });
//   }
// );
