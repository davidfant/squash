import { checkoutLatestCommit } from "@/agent/checkoutLatestCommit";
import { streamAgent } from "@/agent/streamAgent";
import type { AgentRuntimeContext, ChatMessage } from "@/agent/types";
import { requireAuth } from "@/auth/middleware";
import type { Database } from "@/database";
import type { MessageUsage } from "@/database/schema";
import * as schema from "@/database/schema";
import { waitForMachineHealthy } from "@/lib/flyio/sandbox";
import { getLangsmithClient } from "@/lib/langsmith";
import { resolveMessageThreadHistory } from "@/lib/resolveMessageThreadHistory";
import { zValidator } from "@hono/zod-validator";
import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { traceable } from "langsmith/traceable";
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

      // Initialize Langsmith OTEL tracing
      const client = getLangsmithClient(c.env);

      // Create the traced handler
      const tracedHandler = traceable(
        async () => {
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

          const [messages] = await Promise.all([
            await (async () => {
              if (allMessages.some((m) => m.id === body.message.id)) {
                return resolveMessageThreadHistory(
                  allMessages,
                  body.message.id
                );
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
            })(),
            waitForMachineHealthy(
              branch.sandbox.appId,
              branch.sandbox.machineId,
              c.env.FLY_API_KEY
            ),
          ]);
          const runtimeContext: AgentRuntimeContext = {
            type: "flyio",
            sandbox: {
              appId: branch.sandbox.appId,
              machineId: branch.sandbox.machineId,
              workdir: branch.sandbox.workdir,
              apiKey: c.env.FLY_API_KEY,
            },
            todos:
              messages
                .flatMap((m) => m.parts)
                .filter((p) => p.type === "tool-todoWrite")
                .findLast((p) => p.state === "output-available")?.output
                ?.todos ?? [],
          };

          await checkoutLatestCommit(messages, runtimeContext, db);
          const messagesWithoutRoot = messages.filter(
            (m) => m.role !== "system"
          );

          const nextParentId = messages[messages.length - 1]!.id;
          const usage: MessageUsage[] = [];
          return streamAgent(messagesWithoutRoot, runtimeContext, {
            env: c.env,
            threadId: params.branchId,
            fileTransfer: {
              bucket: c.env.R2_FILE_TRANSFER_BUCKET,
              bucketName: c.env.R2_FILE_TRANSFER_BUCKET_NAME,
              url: c.env.R2_FILE_TRANSFER_ENDPOINT_URL_S3,
              accessKeyId: c.env.R2_FILE_TRANSFER_ACCESS_KEY_ID,
              secretAccessKey: c.env.R2_FILE_TRANSFER_SECRET_ACCESS_KEY,
            },
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
          });
        },
        {
          name: "Code Gen Agent",
          run_type: "chain",
          metadata: {
            branchId: params.branchId,
            userId: user.id,
            session_id: params.branchId, // single LS thread per branch
          },
          // omit client to avoid type conflicts across subpath resolutions
        }
      );

      // Execute the traced handler
      const result = await tracedHandler();

      // Ensure traces are flushed
      if (client) {
        await client.awaitPendingTraceBatches();
      }

      return result;
    }
  );
