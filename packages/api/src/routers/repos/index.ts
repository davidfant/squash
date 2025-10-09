import { generateName } from "@/agent/name/generate";
import { requireActiveOrganization, requireAuth } from "@/auth/middleware";
import type { Database } from "@/database";
import * as schema from "@/database/schema";
import { zUserMessagePart } from "@/routers/zod";
import { zSandboxSnapshotConfig } from "@/sandbox/zod";
import { TEMPLATE_NAMES, forkTemplate, type TemplateName } from "@/templates";
import { zValidator } from "@hono/zod-validator";
import { randomUUID } from "crypto";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
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
        previewUrl: schema.repo.previewUrl,
        imageUrl: schema.repo.imageUrl,
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
      .orderBy(asc(schema.repo.name))
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
  .patch(
    "/:repoId",
    zValidator("param", z.object({ repoId: z.uuid() })),
    zValidator("json", z.object({ name: z.string().min(1).max(255) })),
    requireRepo,
    async (c) => {
      const db = c.get("db");
      const { repoId } = c.req.valid("param");
      const body = c.req.valid("json");

      await db
        .update(schema.repo)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(schema.repo.id, repoId));
      return c.json({ id: repoId });
    }
  )
  .put(
    "/:repoId/snapshot",
    zValidator("param", z.object({ repoId: z.string() })),
    zValidator(
      "json",
      z.object({
        hidden: z.boolean().optional(),
        snapshot: zSandboxSnapshotConfig.optional(),
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
        template: z.enum(
          TEMPLATE_NAMES as unknown as [TemplateName, ...TemplateName[]]
        ),
        name: z.string().min(1).max(255).optional(),
        hidden: z.boolean().optional(),
      })
    ),
    requireAuth,
    requireActiveOrganization,
    async (c) => {
      const { template, name, hidden = false } = c.req.valid("json");
      const organizationId = c.get("organizationId");
      const db = c.get("db");

      try {
        const provisioned = await forkTemplate(c.env, template);
        const repoName = name?.trim() || kebabCase(`${template}-${provisioned.id}`);

        const [newRepo] = await db
          .insert(schema.repo)
          .values({
            id: provisioned.id,
            name: repoName,
            gitUrl: provisioned.gitUrl,
            defaultBranch: provisioned.defaultBranch,
            snapshot: provisioned.snapshot,
            hidden,
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
    "/:repoId",
    zValidator("param", z.object({ repoId: z.uuid() })),
    requireRepo,
    (c) => c.json(c.get("repo"))
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
      const repo = c.get("repo");

      const ipAddress =
        c.req.header("cf-connecting-ip") ??
        c.req.header("x-forwarded-for") ??
        c.req.raw.headers.get("x-forwarded-for");

      const parentId = randomUUID();
      const messageId = randomUUID();
      const branchId = randomUUID();

      const [thread, title] = await Promise.all([
        db
          .insert(schema.messageThread)
          .values({ ipAddress })
          .returning()
          .then(([thread]) => thread!),
        generateName(
          message.parts
            .filter((p) => p.type === "text")
            .map((p) => p.text)
            .join(" ")
        ),
      ]);

      const branchName = `${kebabCase(title)}-${branchId.split("-")[0]}`;
      const manager = c.env.DAYTONA_SANDBOX_MANAGER.getByName(branchId);

      if (repo.snapshot.type !== "daytona") {
        throw new Error("Only daytona snapshots are supported for Daytona");
      }

      await Promise.all([
        db.insert(schema.message).values([
          {
            id: parentId,
            role: "system",
            threadId: thread.id,
            parts: [],
            createdAt: new Date(),
          },
          {
            id: messageId,
            role: "user" as const,
            threadId: thread.id,
            parts: message.parts,
            parentId,
            createdAt: new Date(Date.now() + 1),
          },
        ]),
        db.insert(schema.repoBranch).values({
          id: branchId,
          title,
          name: branchName,
          threadId: thread.id,
          repoId,
          createdBy: user.id,
          sandboxProvider: "daytona",
        }),
        manager.init({
          config: repo.snapshot,
          branch: { id: branchId, repoId, name: branchName },
        }),
      ]);

      await manager.startAgent({
        messages: [
          { id: parentId, role: "system", parts: [] },
          { id: messageId, role: "user", parts: message.parts },
        ],
        threadId: thread.id,
        branchId,
        restoreVersion: false,
      });

      return c.json({ id: branchId });
    }
  );
