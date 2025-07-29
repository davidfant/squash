import {
  requireActiveOrganization,
  requireAuth,
  type User,
} from "@/auth/middleware";
import type { Database } from "@/database";
import * as schema from "@/database/schema";
import {
  generatePageFileContent,
  generateSectionFileContent,
} from "@/repo/generateFileContent";
import { uploadFiles } from "@/repo/uploadFiles";
import { Daytona, DaytonaError, Sandbox, SandboxState } from "@daytonaio/sdk";
import { zValidator } from "@hono/zod-validator";
import type { ProjectMetadata } from "dev-server-utils/metadata";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import path from "node:path";
import { z } from "zod";

const REPO_ROOT = "/root/repo";

const generateMetadata = async (sandbox: Sandbox): Promise<ProjectMetadata> => {
  const res = await sandbox.process.executeCommand(
    "pnpm generate-metadata",
    "/root/repo"
  );
  return JSON.parse(res.result);
};

async function timer<T>(name: string, fn: () => Promise<T>) {
  const startedAt = performance.now();
  const res = await fn();
  const duration = performance.now() - startedAt;
  console.log(`[${name}] took ${duration}ms`);
  return res;
}

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

const loadProjectSandboxData = (id: string, userId: string, db: Database) =>
  db
    .select({
      id: schema.projects.id,
      metadata: schema.projects.metadata,
      daytonaSandboxId: schema.projects.daytonaSandboxId,
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

export const requireProjectSandbox = createMiddleware<{
  Bindings: CloudflareBindings;
  Variables: {
    db: Database;
    user: User;
    sandbox: Sandbox;
    project: NonNullable<Awaited<ReturnType<typeof loadProjectSandboxData>>>;
  };
}>(async (c, next) => {
  const db = c.get("db");
  const projectId = c.req.param("projectId")!;
  const userId = c.get("user").id;
  const project = await loadProjectSandboxData(projectId, userId, db);
  if (!project) return c.json({ error: "Project not found" }, 404);

  const daytona = new Daytona({ apiKey: c.env.DAYTONA_API_KEY });
  const sandbox = await daytona.get(project.daytonaSandboxId);

  const sbx = await daytona.get(project.daytonaSandboxId);
  if (sbx.state !== SandboxState.STARTED) {
    await sbx.start().finally(() => sbx.waitUntilStarted(60));
  }

  c.set("sandbox", sandbox);
  c.set("project", project);
  await next();
});

export const projectsRouter = new Hono<{
  Bindings: CloudflareBindings;
  Variables: { db: Database };
}>()
  .get("/", requireAuth, requireActiveOrganization, async (c) => {
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
    zValidator("json", z.object({ name: z.string(), threadId: z.string() })),
    requireAuth,
    requireActiveOrganization,
    async (c) => {
      const user = c.get("user");
      const organizationId = c.get("organizationId");
      const db = c.get("db");
      const body = c.req.valid("json");

      const daytona = new Daytona({ apiKey: c.env.DAYTONA_API_KEY });

      const sandbox = await timer("create sandbox", async () => {
        let attempts = 0;
        while (true) {
          try {
            return await daytona.create({
              language: "typescript",
              autoStopInterval: 5,
              autoArchiveInterval: 60,
              public: true,
              snapshot: "dev-server:0.0.4",
            });
          } catch (error) {
            if (
              error instanceof DaytonaError &&
              error.message === "No available runners"
            ) {
              attempts++;
              if (attempts > 10) throw error;
              console.log(
                `[create sandbox] no available runners, retrying... (${attempts})`
              );
              await new Promise((resolve) => setTimeout(resolve, 1000));
              continue;
            } else {
              throw error;
            }
          }
        }
      });

      const metadata = await timer("generate metadata", () =>
        generateMetadata(sandbox)
      );
      const [project] = await db
        .insert(schema.projects)
        .values({
          name: body.name,
          organizationId,
          createdBy: user.id,
          daytonaSandboxId: sandbox.id,
          threadId: body.threadId,
          metadata,
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
  .get(
    "/:projectId/dev-server",
    zValidator("param", z.object({ projectId: z.string().uuid() })),
    requireAuth,
    requireProjectSandbox,
    async (c) => {
      const sandbox = c.get("sandbox");
      const { url } = await sandbox.getPreviewLink(3000);

      let attempts = 0;
      while (true) {
        const res = await fetch(url, { method: "HEAD" });
        if (res.ok) break;
        await new Promise((resolve) => setTimeout(resolve, 1000));
        attempts++;
        if (attempts > 10) return c.json({ error: "Sandbox not ready" }, 500);
      }

      return c.json({ url });
    }
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
    requireProjectSandbox,
    async (c) => {
      const body = c.req.valid("json");
      const params = c.req.valid("param");
      const sandbox = c.get("sandbox");
      const project = c.get("project");

      const section = project.metadata.sections.find(
        (s) => s.id === params.sectionId
      );
      if (!section) return c.json({ error: "Section not found" }, 404);

      const content = generateSectionFileContent({
        name: body.name ?? section.name,
        variantId:
          body.variantId ?? section.variants.find((v) => v.selected)?.id!,
      });

      await uploadFiles(
        sandbox.id,
        [{ content, path: path.join(REPO_ROOT, section.filePath) }],
        { apiKey: c.env.DAYTONA_API_KEY }
      );

      const metadata = await timer("generate metadata", () =>
        generateMetadata(sandbox)
      );
      const res = await c
        .get("db")
        .update(schema.projects)
        .set({ metadata })
        .where(eq(schema.projects.id, project.id))
        .returning();

      return c.json({ id: project.id, metadata });
    }
  );
