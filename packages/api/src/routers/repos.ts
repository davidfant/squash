import { generateName } from "@/agent/name/generate";
import type { Database } from "@/database";
import * as schema from "@/database/schema";
import { TEMPLATE_NAMES, forkTemplate } from "@/lib/repo/fork";
import {
  loadAuth,
  requireAuth,
  requireRepo,
  requireRole,
} from "@/routers/util/auth-middleware";
import { zUserMessagePart } from "@/routers/util/zod";
import { zValidator } from "@hono/zod-validator";
import { randomUUID } from "crypto";
import { and, asc, desc, eq, isNull, or } from "drizzle-orm";
import { Hono } from "hono";
import z from "zod";

export const reposRouter = new Hono<{
  Bindings: CloudflareBindings;
  Variables: { db: Database };
}>()
  .get("/featured", async (c) => {
    const db = c.get("db");

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
      .where(and(eq(schema.repo.public, true), isNull(schema.repo.deletedAt)))
      .orderBy(desc(schema.repo.updatedAt))
      .limit(24);

    return c.json(repos);
  })
  .get("/", loadAuth, requireAuth, async (c) => {
    const organizationId = c.get("organizationId");
    const db = c.get("db");

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
      .orderBy(asc(schema.repo.name))
      .where(
        and(
          eq(schema.repo.organizationId, organizationId),
          isNull(schema.repo.deletedAt)
        )
      );

    return c.json(repos);
  })
  .post(
    "/",
    zValidator(
      "json",
      z.object({
        template: z.enum(TEMPLATE_NAMES),
        message: z.object({ parts: zUserMessagePart.array().min(1) }),
      })
    ),
    loadAuth,
    requireAuth,
    requireRole("org:admin", "org:builder"),
    requireRepo,
    async (c) => {
      const body = c.req.valid("json");
      const db = c.get("db");

      const ipAddress =
        c.req.header("cf-connecting-ip") ??
        c.req.header("x-forwarded-for") ??
        c.req.raw.headers.get("x-forwarded-for");

      const parentId = randomUUID();
      const messageId = randomUUID();
      const branchId = randomUUID();

      const threadP = db
        .insert(schema.messageThread)
        .values({ ipAddress })
        .returning()
        .then(([thread]) => thread!);

      try {
        const [provisioned, name] = await Promise.all([
          forkTemplate(c.env, body.template),
          generateName(
            body.message.parts
              .filter((p) => p.type === "text")
              .map((p) => p.text)
              .join(" ")
          ),
        ]);

        if (provisioned.snapshot.type !== "daytona") {
          throw new Error("Only daytona snapshots are supported for Daytona");
        }

        const repoP = db
          .insert(schema.repo)
          .values({
            id: provisioned.id,
            name,
            gitUrl: provisioned.gitUrl,
            defaultBranch: provisioned.defaultBranch,
            snapshot: provisioned.snapshot,
            // TODO: default to true for non-paying orgs
            public: false,
            organizationId: c.get("organizationId"),
            createdBy: c.get("userId"),
          })
          .returning()
          .then(([repo]) => repo!);

        const [thread, repo] = await Promise.all([threadP, repoP]);
        const manager = c.env.DAYTONA_SANDBOX_MANAGER.getByName(branchId);
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
              parts: body.message.parts,
              parentId,
              createdAt: new Date(Date.now() + 1),
            },
          ]),
          db.insert(schema.repoBranch).values({
            id: branchId,
            title: "Production",
            name: provisioned.defaultBranch,
            threadId: thread.id,
            repoId: provisioned.id,
            createdBy: c.get("userId"),
            sandboxProvider: "daytona",
          }),
          manager.init({
            config: provisioned.snapshot,
            branch: {
              id: branchId,
              repoId: provisioned.id,
              name: provisioned.defaultBranch,
            },
          }),
        ]);

        await manager.startAgent({
          messages: [
            { id: parentId, role: "system", parts: [] },
            { id: messageId, role: "user", parts: body.message.parts },
          ],
          threadId: thread.id,
          branchId,
          restoreVersion: false,
        });

        return c.json({
          ...repo,
          branches: [{ id: branchId }],
        });
      } catch (error) {
        console.error("Error creating repository:", error);
        return c.json({ error: "Failed to create repository" }, 500);
      }
    }
  )
  .get(
    "/:repoId",
    zValidator("param", z.object({ repoId: z.uuid() })),
    loadAuth,
    async (c) => {
      const { repoId } = c.req.valid("param");
      const organizationId = c.get("organizationId");

      const repo = await c
        .get("db")
        .select({
          id: schema.repo.id,
          name: schema.repo.name,
          previewUrl: schema.repo.previewUrl,
          imageUrl: schema.repo.imageUrl,
          createdAt: schema.repo.createdAt,
          updatedAt: schema.repo.updatedAt,
          suggestions: schema.repo.suggestions,
        })
        .from(schema.repo)
        .where(
          and(
            eq(schema.repo.id, repoId),
            or(
              eq(schema.repo.organizationId, organizationId!),
              eq(schema.repo.public, true)
            )
          )
        )
        .then(([repo]) => repo);
      if (!repo) return c.json({ error: "Repo not found" }, 404);
      return c.json(repo);
    }
  )
  .delete(
    "/:repoId",
    zValidator("param", z.object({ repoId: z.string() })),
    loadAuth,
    requireAuth,
    requireRole("org:admin", "org:builder"),
    requireRepo,
    async (c) => {
      const db = c.get("db");
      const { repoId } = c.req.valid("param");
      await db
        .update(schema.repo)
        .set({ deletedAt: new Date() })
        .where(eq(schema.repo.id, repoId));
      return c.json({ success: true });
    }
  )
  .patch(
    "/:repoId",
    zValidator("param", z.object({ repoId: z.uuid() })),
    zValidator("json", z.object({ name: z.string().min(1).max(255) })),
    loadAuth,
    requireAuth,
    requireRole("org:admin", "org:builder"),
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
  );

// .get(
//   "/:repoId/branches",
//   zValidator("param", z.object({ repoId: z.uuid() })),
//   requireAuth,
//   requireActiveOrganization,
//   async (c) => {
//     const { repoId } = c.req.valid("param");
//     const user = c.get("user");
//     const db = c.get("db");
//     const organizationId = c.get("organizationId");

//     const branches = await db
//       .select({
//         id: schema.repoBranch.id,
//         title: schema.repoBranch.title,
//         name: schema.repoBranch.name,
//         imageUrl: schema.repoBranch.imageUrl,
//         createdAt: schema.repoBranch.createdAt,
//         updatedAt: schema.repoBranch.updatedAt,
//         repo: { id: schema.repo.id, name: schema.repo.name },
//         createdBy: {
//           id: schema.user.id,
//           name: schema.user.name,
//           image: schema.user.image,
//         },
//       })
//       .from(schema.repo)
//       .innerJoin(
//         schema.repoBranch,
//         eq(schema.repo.id, schema.repoBranch.repoId)
//       )
//       .innerJoin(schema.user, eq(schema.repoBranch.createdBy, schema.user.id))
//       .innerJoin(
//         schema.member,
//         eq(schema.repo.organizationId, schema.member.organizationId)
//       )
//       .where(
//         and(
//           eq(schema.repo.id, repoId),
//           eq(schema.repo.organizationId, organizationId),
//           isNull(schema.repo.deletedAt),
//           eq(schema.member.userId, user.id),
//           isNull(schema.repoBranch.deletedAt)
//         )
//       )
//       .orderBy(desc(schema.repoBranch.updatedAt));

//     return c.json(branches);
//   }
// )
// .post(
//   "/:repoId/fork",
//   zValidator("param", z.object({ repoId: z.uuid() })),
//   requireAuth,
//   requireActiveOrganization,
//   requireRepo("read"),
//   async (c) => {
//     const repo = c.get("repo");
//     const db = c.get("db");
//     const organizationId = c.get("organizationId");
//     const forked = await forkRepo(c.env, repo);

//     const [forkedRepo] = await db
//       .insert(schema.repo)
//       .values({
//         id: forked.id,
//         name: repo.name,
//         gitUrl: forked.gitUrl,
//         defaultBranch: forked.defaultBranch,
//         snapshot: forked.snapshot,
//         hidden: false,
//         private: false,
//         providerId: null,
//         externalId: null,
//         imageUrl: repo.imageUrl,
//         previewUrl: repo.previewUrl,
//         organizationId,
//       })
//       .returning();

//     return c.json(forkedRepo!);
//   }
// )
