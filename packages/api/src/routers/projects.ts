import {
  requireActiveOrganization,
  requireAuth,
  type Session,
  type User,
} from "@/auth/middleware";
import type { Database } from "@/database";
import * as schema from "@/database/schema";
import {
  generatePageFileContent,
  generateSectionFileContent,
} from "@/repo/generateFileContent";
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
    .innerJoin(schema.user, eq(schema.projects.createdBy, schema.user.id))
    .innerJoin(
      schema.organization,
      eq(schema.projects.organizationId, schema.organization.id)
    )
    .innerJoin(
      schema.member,
      eq(schema.organization.id, schema.member.organizationId)
    )
    .where(and(eq(schema.projects.id, id), eq(schema.member.userId, userId)))
    .then((ps) => ps[0]);

export const requireProject = createMiddleware<{
  Variables: {
    db: Database;
    user: User;
    session: Session;
    project: NonNullable<Awaited<ReturnType<typeof loadProject>>>;
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
  .get("/", requireAuth, requireActiveOrganization, async (c) => {
    const session = c.get("session");
    const user = c.get("user");
    const db = c.get("db");
    const organizationId = c.get("organizationId");

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
          sql`CASE WHEN ${schema.projects.createdBy} = ${user.id} THEN 1 ELSE 0 END`
        ),
        desc(schema.projects.updatedAt)
      )
      .where(
        and(
          eq(schema.organization.id, organizationId),
          isNull(schema.projects.deletedAt),
          eq(schema.member.userId, user!.id)
        )
      );

    return c.json(projects);
  })
  .post(
    "/",
    zValidator("json", z.object({ name: z.string() })),
    requireAuth,
    requireActiveOrganization,
    async (c) => {
      const user = c.get("user");
      const organizationId = c.get("organizationId");
      const db = c.get("db");
      const body = c.req.valid("json");

      const [project] = await db
        .insert(schema.projects)
        .values({
          name: body.name,
          organizationId,
          createdBy: user.id,
          // TODO: initialize this correctly!!
          gitRepoUrl: "",
          metadata: {
            sections: [
              {
                id: "QC9zZWN0aW9ucy9IZXJv",
                name: "Hero",
                variants: [
                  {
                    id: "QC9zZWN0aW9ucy9IZXJvL0hlcm8x",
                    name: "My Hero 1",
                    selected: true,
                  },
                  {
                    id: "QC9zZWN0aW9ucy9IZXJvL0hlcm8y",
                    name: "My Hero 2",
                    selected: false,
                  },
                ],
              },
            ],
            pages: [
              {
                id: "QC9wYWdlcy9pbmRleA==",
                name: "Home",
                path: "/",
                sectionIds: ["QC9zZWN0aW9ucy9IZXJv"],
              },
              {
                id: "QC9wYWdlcy9hYm91dA==",
                name: "About",
                path: "/about",
                sectionIds: ["QC9zZWN0aW9ucy9IZXJv"],
              },
            ],
          },
        })
        .returning();

      return c.json({ id: project!.id });
    }
  )
  .get(
    "/:projectId",
    zValidator("param", z.object({ projectId: z.string().uuid() })),
    requireAuth,
    requireProject,
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
    "/:projectId/pages/:pageId",
    zValidator(
      "param",
      z.object({ projectId: z.string().uuid(), pageId: z.string() })
    ),
    zValidator(
      "json",
      z.object({
        name: z.string().optional(),
        sectionIds: z.string().array().optional(),
      })
    ),
    requireAuth,
    requireProject,
    async (c) => {
      // 1. get/create dev server
      // 2. log into dev server, and add page
      // 3. commit
      // 4. generate metadata
      // 5. insert message in the chat thread
      // 6. update project in DB

      const project = c.get("project");
      const body = c.req.valid("json");

      const page = project.metadata.pages.find(
        (p) => p.id === c.req.param("pageId")
      );
      if (!page) return c.json({ error: "Page not found" }, 404);

      const content = generatePageFileContent({
        name: body.name ?? page.name,
        sectionIds: body.sectionIds ?? page.sectionIds,
      });
      console.log("UPDATE PAGE...", content);

      return c.json(project);
    }
  )
  .put(
    "/:projectId/pages/:pageId/sections/:sectionId",
    zValidator(
      "param",
      z.object({
        projectId: z.string().uuid(),
        pageId: z.string(),
        sectionId: z.string(),
      })
    ),
    zValidator(
      "json",
      z.object({
        name: z.string().optional(),
        variantId: z.string().optional(),
      })
    ),
    requireAuth,
    requireProject,
    async (c) => {
      const project = c.get("project");
      const body = c.req.valid("json");
      const params = c.req.valid("param");

      const section = project.metadata.sections.find(
        (s) => s.id === params.sectionId
      );
      if (!section) return c.json({ error: "Section not found" }, 404);

      const content = generateSectionFileContent({
        name: body.name ?? section.name,
        variantId:
          body.variantId ?? section.variants.find((v) => v.selected)?.id!,
      });
      // TODO: get/create dev server
      // TODO: write to file system in preview dev server, commit and push
      // TODO: insert message in chat thread
      // TODO: regenerate metadata and update the project
      project.metadata.sections.forEach((s) => {
        if (s.id === params.sectionId) {
          s.name = body.name ?? s.name;
          s.variants = s.variants.map((v) => ({
            ...v,
            selected: v.id === body.variantId,
          }));
        }
      });
      await c
        .get("db")
        .update(schema.projects)
        .set({ metadata: project.metadata })
        .where(eq(schema.projects.id, project.id));

      return c.json(project);
    }
  );
