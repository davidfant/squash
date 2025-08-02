// import {
//   requireActiveOrganization,
//   requireAuth,
//   type User,
// } from "@/auth/middleware";
// import type { Database } from "@/database";
// import type { BranchVirtualMachine } from "@/database/schema";
// import * as schema from "@/database/schema";
// import { createFlyApp, createFlyMachine } from "@/lib/flyio";
// import { timer } from "@/lib/timer";
// import { zValidator } from "@hono/zod-validator";
// import { randomUUID } from "crypto";
// import { and, desc, eq, isNull, sql } from "drizzle-orm";
// import { Hono } from "hono";
// import { createMiddleware } from "hono/factory";
// import kebabCase from "lodash.kebabcase";
// import { z } from "zod";

// interface Project {
//   id: string;
//   name: string;
//   createdAt: Date;
//   updatedAt: Date;
//   threadId: string;
//   createdBy: {
//     id: string;
//     name: string;
//     image: string | null;
//   };
//   previewUrl: string;
// }

// const loadProject = (id: string, userId: string, db: Database) =>
//   db
//     .select({
//       id: schema.repoBranches.id,
//       name: schema.repoBranches.name,
//       vm: schema.repoBranches.vm,
//       createdAt: schema.repoBranches.createdAt,
//       updatedAt: schema.repoBranches.updatedAt,
//       threadId: schema.repoBranches.threadId,
//       createdBy: {
//         id: schema.user.id,
//         name: schema.user.name,
//         image: schema.user.image,
//       },
//     })
//     .from(schema.repoBranches)
//     .innerJoin(schema.user, eq(schema.repoBranches.createdBy, schema.user.id))
//     .innerJoin(
//       schema.organization,
//       eq(schema.repoBranches.organizationId, schema.organization.id)
//     )
//     .innerJoin(
//       schema.member,
//       eq(schema.organization.id, schema.member.organizationId)
//     )
//     .where(
//       and(eq(schema.repoBranches.id, id), eq(schema.member.userId, userId))
//     )
//     .then((ps) => ps[0]);

// export const requireProject = createMiddleware<{
//   Variables: {
//     db: Database;
//     user: User;
//     project: Project;
//     vm: BranchVirtualMachine;
//   };
// }>(async (c, next) => {
//   const db = c.get("db");
//   const projectId = c.req.param("projectId")!;
//   const userId = c.get("user").id;
//   const res = await loadProject(projectId, userId, db);
//   if (!res) return c.json({ error: "Project not found" }, 404);
//   const { vm, ...project } = res;

//   c.set("project", { ...project, previewUrl: vm.url });
//   c.set("vm", vm);
//   await next();
// });

// export const projectsRouter = new Hono<{
//   Bindings: CloudflareBindings;
//   Variables: { db: Database };
// }>()
//   .use(requireAuth)
//   .get("/", requireActiveOrganization, async (c) => {
//     const user = c.get("user");
//     const db = c.get("db");
//     const organizationId = c.get("organizationId");

//     const projects = await db
//       .select({
//         id: schema.repoBranches.id,
//         name: schema.repoBranches.name,
//         createdAt: schema.repoBranches.createdAt,
//         updatedAt: schema.repoBranches.updatedAt,
//         createdBy: {
//           id: schema.user.id,
//           name: schema.user.name,
//           image: schema.user.image,
//         },
//       })
//       .from(schema.repoBranches)
//       .innerJoin(schema.user, eq(schema.repoBranches.createdBy, schema.user.id))
//       .innerJoin(
//         schema.organization,
//         eq(schema.repoBranches.organizationId, schema.organization.id)
//       )
//       .innerJoin(
//         schema.member,
//         eq(schema.organization.id, schema.member.organizationId)
//       )
//       .orderBy(
//         desc(
//           sql`CASE WHEN ${schema.repoBranches.createdBy} = ${user.id} THEN 1 ELSE 0 END`
//         ),
//         desc(schema.repoBranches.updatedAt)
//       )
//       .where(
//         and(
//           eq(schema.organization.id, organizationId),
//           isNull(schema.repoBranches.deletedAt),
//           eq(schema.member.userId, user!.id)
//         )
//       );

//     return c.json(projects);
//   })
//   .post(
//     "/",
//     zValidator("json", z.object({ name: z.string(), threadId: z.string() })),
//     requireActiveOrganization,
//     async (c) => {
//       const user = c.get("user");
//       const organizationId = c.get("organizationId");
//       const db = c.get("db");
//       const body = c.req.valid("json");

//       const appId = randomUUID();
//       const appName = `${kebabCase(body.name)}-${appId.split("-")[0]}`;

//       const flyApp = await timer("create fly app", () =>
//         createFlyApp(appName, c.env.FLY_API_KEY)
//       );
//       const flyMachine = await timer("create fly machine", () =>
//         createFlyMachine(appName, c.env.FLY_API_KEY)
//       );

//       const [project] = await db
//         .insert(schema.repoBranches)
//         .values({
//           id: appId,
//           name: body.name,
//           organizationId,
//           createdBy: user.id,
//           vm: {
//             type: "flyio",
//             appId: flyApp.id,
//             url: `https://${appName}.fly.dev`,
//           },
//           threadId: body.threadId,
//         })
//         .returning();

//       return c.json({ id: project!.id });
//     }
//   )
//   .get(
//     "/:projectId",
//     zValidator("param", z.object({ projectId: z.string().uuid() })),
//     requireProject,
//     (c) => c.json(c.get("project"))
//   )
//   // .get(
//   //   "/:projectId/dev-server",
//   //   zValidator("param", z.object({ projectId: z.string().uuid() })),
//   //   requireProject,
//   //   async (c) => {
//   //     const { machineId } = c.get("flyio");
//   //     const [appName, machineIdFromVm] = machineId.machineId.split(":");

//   //     // Fly.io app URL format is https://{app-name}.fly.dev
//   //     const url = `https://${appName}.fly.dev`;

//   //     let attempts = 0;
//   //     while (true) {
//   //       try {
//   //         const res = await fetch(url, { method: "HEAD" });
//   //         if (res.ok) break;
//   //       } catch (error) {
//   //         // Machine might be starting up
//   //       }

//   //       await new Promise((resolve) => setTimeout(resolve, 1000));
//   //       attempts++;
//   //       if (attempts > 10) return c.json({ error: "Machine not ready" }, 500);
//   //     }

//   //     return c.json({ url });
//   //   }
//   // )
//   .put(
//     "/:projectId/pages/:pageId",
//     zValidator(
//       "param",
//       z.object({ projectId: z.string().uuid(), pageId: z.string() })
//     ),
//     zValidator(
//       "json",
//       z.object({
//         name: z.string().optional(),
//         sectionIds: z.string().array().optional(),
//       })
//     ),
//     requireProject,
//     async (c) => {
//       const project = c.get("project");
//       const body = c.req.valid("json");

//       // For now, just return the project since we removed metadata functionality
//       // This would need to be implemented with the new Fly.io setup
//       console.log("UPDATE PAGE...", body);

//       return c.json(project);
//     }
//   );
