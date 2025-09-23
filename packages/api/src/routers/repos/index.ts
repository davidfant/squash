import { requireActiveOrganization, requireAuth } from "@/auth/middleware";
import type { Database } from "@/database";
import * as schema from "@/database/schema";
import type { SandboxDurableObjectApp } from "@/durable-objects/sandbox";
import { generateText } from "@/lib/ai";
import { zUserMessagePart } from "@/routers/schemas";
import { google } from "@ai-sdk/google";
import { zValidator } from "@hono/zod-validator";
import { randomUUID } from "crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { hc } from "hono/client";
import kebabCase from "lodash.kebabcase";
import z from "zod";
import { requireRepo } from "./middleware";

export const reposRouter = new Hono<{
  Bindings: CloudflareBindings;
  Variables: { db: Database };
}>()
  .use(requireAuth, requireActiveOrganization)
  .get("/", async (c) => {
    const user = c.get("user");
    const db = c.get("db");
    const organizationId = c.get("organizationId");

    const repos = await db
      .select({
        id: schema.repo.id,
        name: schema.repo.name,
        createdAt: schema.repo.createdAt,
        updatedAt: schema.repo.updatedAt,
      })
      .from(schema.repo)
      .innerJoin(
        schema.organization,
        eq(schema.repo.organizationId, schema.organization.id)
      )
      .innerJoin(
        schema.member,
        eq(schema.organization.id, schema.member.organizationId)
      )
      .orderBy(desc(schema.repo.name))
      .where(
        and(
          eq(schema.organization.id, organizationId),
          isNull(schema.repo.deletedAt),
          eq(schema.member.userId, user.id),
          eq(schema.repo.hidden, false)
        )
      );

    return c.json(repos);
  })
  .delete(
    "/:repoId",
    zValidator("param", z.object({ repoId: z.string() })),
    requireRepo,
    async (c) => {
      const repo = c.get("repo");
      const db = c.get("db");

      try {
        // Soft delete the repository
        await db
          .update(schema.repo)
          .set({ deletedAt: new Date() })
          .where(eq(schema.repo.id, repo.id));

        return c.json({ success: true });
      } catch (error) {
        console.error("Error deleting repository:", error);
        return c.json({ error: "Failed to delete repository" }, 500);
      }
    }
  )
  .put(
    "/:repoId/snapshot",
    zValidator("param", z.object({ repoId: z.string() })),
    zValidator(
      "json",
      z.object({
        hidden: z.boolean().optional(),
        snapshot: z
          .object({
            type: z.literal("docker"),
            port: z.number(),
            image: z.string(),
            workdir: z.string(),
            cmd: z.object({
              prepare: z.string().optional(),
              entrypoint: z.string(),
            }),
          })
          .optional(),
      })
    ),
    requireRepo,
    async (c) => {
      const repo = c.get("repo");
      const db = c.get("db");
      const update = c.req.valid("json");

      try {
        // Update the repo with new snapshot
        await db
          .update(schema.repo)
          .set({ ...update, updatedAt: new Date() })
          .where(eq(schema.repo.id, repo.id));

        return c.json({
          message: "Repository updated successfully",
          ...update,
        });
      } catch (error) {
        console.error("Error updating snapshot:", error);
        return c.json({ error: "Failed to update snapshot" }, 500);
      }
    }
  )
  .post(
    "/",
    zValidator(
      "json",
      z.object({
        name: z.string(),
        url: z.string().url(),
        defaultBranch: z.string(),
        hidden: z.boolean().optional(),
        snapshot: z.object({
          type: z.literal("docker"),
          port: z.number(),
          image: z.string(),
          workdir: z.string(),
          cmd: z.object({
            prepare: z.string().optional(),
            entrypoint: z.string(),
          }),
        }),
      })
    ),
    requireAuth,
    requireActiveOrganization,
    async (c) => {
      const data = c.req.valid("json");
      const organizationId = c.get("organizationId");
      const db = c.get("db");

      try {
        const [newRepo] = await db
          .insert(schema.repo)
          .values({
            ...data,
            private: false,
            providerId: null,
            externalId: null,
            organizationId,
          })
          .returning();

        return c.json(newRepo!);
      } catch (error) {
        console.error("Error creating repository:", error);
        return c.json({ error: "Failed to create repository" }, 500);
      }
    }
  )
  .get(
    "/:repoId/branches",
    zValidator("param", z.object({ repoId: z.uuid() })),
    async (c) => {
      const { repoId } = c.req.valid("param");
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
            eq(schema.repo.id, repoId),
            eq(schema.repo.organizationId, organizationId),
            isNull(schema.repo.deletedAt),
            eq(schema.member.userId, user.id),
            isNull(schema.repoBranch.deletedAt)
          )
        )
        .orderBy(desc(schema.repoBranch.updatedAt));

      return c.json(branches);
    }
  )
  .post(
    "/:repoId/branches",
    zValidator("param", z.object({ repoId: z.uuid() })),
    zValidator(
      "json",
      z.object({
        message: z.object({ parts: zUserMessagePart.array().min(1) }),
      })
    ),
    requireRepo,
    async (c) => {
      const { repoId } = c.req.valid("param");
      const { message } = c.req.valid("json");
      const user = c.get("user");
      const db = c.get("db");

      const ipAddress =
        c.req.header("cf-connecting-ip") ??
        c.req.header("x-forwarded-for") ??
        c.req.raw.headers.get("x-forwarded-for");

      const textContent = message.parts
        .filter((p) => p.type === "text")
        .map((p) => p.text)
        .join(" ");

      const parentId = randomUUID();
      const messageId = randomUUID();
      const branchId = randomUUID();

      const [thread, { text: rawTitle }] = await Promise.all([
        db
          .insert(schema.messageThread)
          .values({ ipAddress })
          .returning()
          .then(([thread]) => thread!),
        generateText({
          model: google("gemini-2.5-flash"),
          prompt: `Generate a concise Jira ticket name (title case, max 50 chars) for this feature request: "${textContent}". Only return the branch name, nothing else.`,
          providerOptions: {
            google: { thinkingConfig: { thinkingBudget: 0 } },
          },
        }),
      ]);

      const title = rawTitle.trim();
      const branchName = `${kebabCase(title)}-${branchId.split("-")[0]}`;

      await Promise.all([
        db.insert(schema.message).values([
          { id: parentId, role: "system", threadId: thread.id, parts: [] },
          {
            id: messageId,
            role: "user",
            threadId: thread.id,
            parts: message.parts,
            parentId,
          },
        ]),
        db.insert(schema.repoBranch).values({
          id: branchId,
          title,
          name: branchName,
          threadId: thread.id,
          repoId,
          createdBy: user.id,
        }),
      ]);

      const stub = c.env.SANDBOX_DO.get(c.env.SANDBOX_DO.idFromName(branchId));
      c.executionCtx.waitUntil(
        hc<SandboxDurableObjectApp>("https://thread", {
          fetch: stub.fetch.bind(stub),
        }).stream.$post({
          json: {
            branchId,
            userId: user.id,
            message: { id: messageId, parts: message.parts, parentId },
          },
        })
      );

      return c.json({ id: branchId });
    }
  );
