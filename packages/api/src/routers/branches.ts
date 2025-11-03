import type { Database } from "@/database";
import * as schema from "@/database/schema";
import {
  loadAuth,
  requireAuth,
  requireRepoBranch,
  requireRole,
} from "@/routers/util/auth-middleware";
import type { AuthObject } from "@clerk/backend";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import z from "zod";
import { repoBranchMessagesRouter } from "./branch-messages";
import { repoBranchPreviewRouter } from "./branch-preview";

const repoBranchRouter = new Hono<{
  Bindings: CloudflareBindings;
  Variables: { db: Database; auth: AuthObject };
}>()
  .use(zValidator("param", z.object({ branchId: z.uuid() })))
  .use(requireRepoBranch)
  .route("/preview", repoBranchPreviewRouter)
  .route("/messages", repoBranchMessagesRouter)
  .get(
    "/",
    zValidator("param", z.object({ branchId: z.uuid() })),
    async (c) => {
      const { branchId } = c.req.valid("param");
      const auth = c.get("auth");
      const branch = await c
        .get("db")
        .select({
          id: schema.repoBranch.id,
          title: schema.repoBranch.title,
          deployment: schema.repoBranch.deployment,
        })
        .from(schema.repoBranch)
        .innerJoin(schema.repo, eq(schema.repoBranch.repoId, schema.repo.id))
        .where(
          and(
            eq(schema.repoBranch.id, branchId),
            eq(schema.repo.organizationId, auth.orgId!)
          )
        )
        .then(([branch]) => branch);
      if (!branch) return c.json({ error: "Branch not found" }, 404);
      return c.json(branch);
    }
  )
  .patch(
    "/",
    zValidator("param", z.object({ branchId: z.uuid() })),
    zValidator("json", z.object({ title: z.string().min(1).max(255) })),
    requireRole("org:admin", "org:builder"),
    async (c) => {
      const db = c.get("db");
      const { branchId } = c.req.valid("param");
      const body = c.req.valid("json");

      const auth = c.get("auth");
      const branch = await db
        .select()
        .from(schema.repoBranch)
        .innerJoin(schema.repo, eq(schema.repoBranch.repoId, schema.repo.id))
        .where(
          and(
            eq(schema.repoBranch.id, branchId),
            eq(schema.repo.organizationId, auth.orgId!)
          )
        )
        .then(([branch]) => branch);
      if (!branch) return c.json({ error: "Branch not found" }, 404);

      await db
        .update(schema.repoBranch)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(schema.repoBranch.id, branchId));

      return c.json({ id: branchId });
    }
  )
  .post(
    "/deploy",
    zValidator("param", z.object({ branchId: z.uuid() })),
    requireRole("org:admin", "org:builder"),
    requireRepoBranch,
    async (c) => {
      const params = c.req.valid("param");
      const sandbox = c.env.DAYTONA_SANDBOX_MANAGER.getByName(params.branchId);
      await sandbox.deploy();
      return sandbox.listenToDeploy();
    }
  )
  // .post(
  //   "/fork",
  //   zValidator("param", z.object({ branchId: z.uuid() })),
  //   zValidator(
  //     "json",
  //     z.object({ name: z.string().min(1).max(255).optional() })
  //   ),
  //   async (c) => {
  //     const params = c.req.valid("param");
  //     const body = c.req.valid("json");
  //     const sandbox = c.env.DAYTONA_SANDBOX_MANAGER.getByName(params.branchId);
  //     const name = body.name?.trim();
  //     await sandbox.fork({ name });
  //     return sandbox.listenToFork();
  //   }
  // )
  .delete(
    "/deploy",
    zValidator("param", z.object({ branchId: z.uuid() })),
    requireRole("org:admin", "org:builder"),
    requireRepoBranch,
    async (c) => {
      const db = c.get("db");
      const params = c.req.valid("param");
      await db
        .update(schema.repoBranch)
        .set({ deployment: null })
        .where(eq(schema.repoBranch.id, params.branchId));
      return c.json({ success: true });
    }
  )
  .delete(
    "/",
    zValidator("param", z.object({ branchId: z.uuid() })),
    requireRole("org:admin", "org:builder"),
    requireRepoBranch,
    async (c) => {
      const db = c.get("db");
      const { branchId } = c.req.valid("param");

      const sandbox = c.env.DAYTONA_SANDBOX_MANAGER.getByName(branchId);
      await sandbox.stopAgent();
      await sandbox.destroy();

      await db
        .update(schema.repoBranch)
        .set({ deletedAt: new Date() })
        .where(eq(schema.repoBranch.id, branchId));

      return c.json({ success: true });
    }
  );

export const repoBranchesRouter = new Hono<{
  Bindings: CloudflareBindings;
  Variables: { db: Database };
}>()
  .use(loadAuth, requireAuth)
  .get("/", async (c) => {
    const organizationId = c.get("organizationId");
    const db = c.get("db");

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
          firstName: schema.user.firstName,
          lastName: schema.user.lastName,
          imageUrl: schema.user.imageUrl,
        },
      })
      .from(schema.repo)
      .innerJoin(
        schema.repoBranch,
        eq(schema.repo.id, schema.repoBranch.repoId)
      )
      .innerJoin(schema.user, eq(schema.repoBranch.createdBy, schema.user.id))
      .where(
        and(
          eq(schema.repo.organizationId, organizationId),
          isNull(schema.repo.deletedAt),
          isNull(schema.repoBranch.deletedAt)
        )
      )
      .orderBy(desc(schema.repoBranch.updatedAt));

    return c.json(branches);
  })
  .route("/:branchId", repoBranchRouter);
