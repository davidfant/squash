import { requireAuth, type Session, type User } from "@/auth/middleware";
import type { Database } from "@/database";
import * as schema from "@/database/schema";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { z } from "zod";

const loadProject = (id: string, userId: string, db: Database) =>
  db
    .select({
      id: schema.projects.id,
      name: schema.projects.name,
      metadata: schema.projects.metadata,
      createdAt: schema.projects.createdAt,
      updatedAt: schema.projects.updatedAt,
      createdBy: {
        id: schema.user.id,
        name: schema.user.name,
        image: schema.user.image,
      },
    })
    .from(schema.projects)
    .innerJoin(
      schema.organization,
      eq(schema.projects.organizationId, schema.organization.id)
    )
    .innerJoin(
      schema.member,
      eq(schema.organization.id, schema.member.organizationId)
    )
    .where(and(eq(schema.projects.id, id), eq(schema.member.userId, userId)));

export const requireProject = createMiddleware<{
  Variables: {
    db: Database;
    user: User;
    session: Session;
    project: Awaited<ReturnType<typeof loadProject>>;
  };
}>(async (c, next) => {
  const db = c.get("db");
  const projectId = c.req.param("projectId")!;
  const userId = c.get("user").id;
  const project = await loadProject(projectId, userId, db);
  if (!project) return c.json({ error: "Project not found" }, 404);

  c.set("project", project);
  await next();
});

export const projectsRouter = new Hono<{
  Bindings: CloudflareBindings;
  Variables: { db: Database };
}>()
  .get("/", requireAuth, async (c) => {
    const session = c.get("session");
    const user = c.get("user");
    const db = c.get("db");

    if (!session?.activeOrganizationId) {
      return c.json({ error: "No active organization" }, 400);
    }

    const projects = await db
      .select({
        id: schema.projects.id,
        name: schema.projects.name,
        metadata: schema.projects.metadata,
        createdAt: schema.projects.createdAt,
        updatedAt: schema.projects.updatedAt,
        createdBy: {
          id: schema.user.id,
          name: schema.user.name,
          image: schema.user.image,
        },
      })
      .from(schema.projects)
      .innerJoin(schema.user, eq(schema.projects.createdBy, schema.user.id))
      .innerJoin(
        schema.organization,
        eq(schema.projects.organizationId, schema.organization.id)
      )
      .innerJoin(
        schema.member,
        eq(schema.organization.id, schema.member.organizationId)
      )
      .orderBy(
        desc(
          sql`CASE WHEN ${schema.projects.createdBy} = ${
            user!.id
          } THEN 1 ELSE 0 END`
        ),
        desc(schema.projects.updatedAt)
      )
      .where(
        and(
          eq(schema.organization.id, session.activeOrganizationId),
          isNull(schema.projects.deletedAt),
          eq(schema.member.userId, user!.id)
        )
      );

    return c.json(projects);
  })
  .get(
    "/:projectId",
    requireAuth,
    requireProject,
    zValidator("param", z.object({ projectId: z.string().uuid() })),
    (c) => c.json(c.get("project"))
  )
  // .post(
  //   "/:projectId/pages",
  //   requireAuth,
  //   requireProject,
  //   zValidator("param", z.object({ projectId: z.string().uuid() })),
  //   zValidator("body", z.object({ projectId: z.string().uuid() })),
  //   async (c) => {
  //     // 1. get/create dev server
  //     // 2. log into dev server, and add page
  //     // 3. commit
  //     // 4. generate metadata
  //     // 5. insert message in the chat thread
  //     // 6. update project in DB

  //     const project = c.get("project");
  //     return c.json(project);
  //   }
  // )
  .put(
    "/:projectId/page-sections",
    requireAuth,
    requireProject,
    zValidator("param", z.object({ projectId: z.string().uuid() })),
    zValidator(
      "json",
      z.object({
        pageId: z.string(),
        name: z.string().optional(),
        sectionIds: z.string().array().optional(),
      })
    ),
    async (c) => {
      // 1. get/create dev server
      // 2. log into dev server, and add page
      // 3. commit
      // 4. generate metadata
      // 5. insert message in the chat thread
      // 6. update project in DB

      const project = c.get("project");
      return c.json(project);
    }
  )
  .put(
    "/:projectId/section-variant",
    requireAuth,
    requireProject,
    zValidator("param", z.object({ projectId: z.string().uuid() })),
    zValidator(
      "json",
      z.object({ pageId: z.string(), sectionIds: z.string().array() })
    ),
    async (c) => {
      // 1. get/create dev server
      // 2. log into dev server, and add page
      // 3. commit
      // 4. generate metadata
      // 5. insert message in the chat thread
      // 6. update project in DB

      const project = c.get("project");
      return c.json(project);
    }
  )
  .post("/");
