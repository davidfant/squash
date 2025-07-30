import { requireAuth } from "@/auth/middleware";
import type { Database } from "@/database";
import type { MessageStatus } from "@/database/schema";
import * as schema from "@/database/schema";
import { loadSandbox } from "@/lib/daytona";
import { stream } from "@/lib/streaming";
import type { RepoRuntimeContext } from "@/mastra/tools/repo";
import { addPage } from "@/mastra/workflows/addPage";
import type { AnyMessage } from "@/types";
import { zValidator } from "@hono/zod-validator";
import { RuntimeContext } from "@mastra/core/runtime-context";
import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { requireProject } from "./projects";
import { checkMessages, zMessageInput } from "./threads";

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
  .get(
    "/messages/projects/:projectId",
    requireAuth,
    zValidator("param", z.object({ projectId: z.string().uuid() })),
    async (c) => {
      const user = c.get("user");
      const { projectId } = c.req.valid("param");
      const messages = await c
        .get("db")
        .select({
          id: schema.messages.id,
          role: schema.messages.role,
          content: schema.messages.content,
          status: schema.messages.status,
          createdAt: schema.messages.createdAt,
        })
        .from(schema.projects)
        .innerJoin(
          schema.messages,
          eq(schema.messages.threadId, schema.projects.threadId)
        )
        .innerJoin(
          schema.organization,
          eq(schema.projects.organizationId, schema.organization.id)
        )
        .innerJoin(
          schema.member,
          eq(schema.organization.id, schema.member.organizationId)
        )
        .where(
          and(
            eq(schema.projects.id, projectId),
            eq(schema.member.userId, user.id)
          )
        )
        .orderBy(asc(schema.messages.createdAt));

      if (!messages.length) return c.json({ error: "Project not found" }, 404);
      return c.json(messages as (AnyMessage & { status: MessageStatus })[]);
    }
  )
  .post(
    "/projects/:projectId/page",
    zValidator("param", z.object({ projectId: z.string().uuid() })),
    zValidator("json", z.object({ message: zMessageInput.optional() })),
    requireAuth,
    requireProject,
    async (c) => {
      const project = c.get("project");
      const daytona = c.get("daytona");
      const db = c.get("db");
      const body = c.req.valid("json");

      const sandboxP = loadSandbox(daytona.sandboxId, c.env.DAYTONA_API_KEY);

      const thread = await db.query.messageThreads.findFirst({
        where: eq(schema.messageThreads.id, project.threadId),
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

      const runtimeContext = new RuntimeContext([
        ["daytona", { sandbox: await sandboxP, apiKey: c.env.DAYTONA_API_KEY }],
        ["db", db],
        ["projectId", project.id],
      ]) satisfies RepoRuntimeContext;

      return stream({
        context: c,
        db,
        threadId: thread.id,
        stream: addPage(messages, runtimeContext),
      });
    }
  );
