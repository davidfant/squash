// @ts-ignore
// import { requireAuth } from "@/auth/middleware";
// import type { Database } from "@/database";
// import * as schema from "@/database/schema";
// import { zValidator } from "@hono/zod-validator";
// import { and, eq, isNull } from "drizzle-orm";
// import { Hono } from "hono";
// import z from "zod";
// import { requireRepo } from "./middleware";

// export const repoBranchDomainsRouter = new Hono<{
//   Bindings: CloudflareBindings;
//   Variables: { db: Database };
// }>()
//   .use(
//     zValidator("param", z.object({ repoId: z.string() })),
//     requireAuth,
//     requireRepo
//   )
//   .get("/", async (c) => {
//     const domains = await c
//       .get("db")
//       .select()
//       .from(schema.repoDomain)
//       .where(
//         and(
//           eq(schema.repoDomain.repoId, c.get("repo").id),
//           isNull(schema.repoDomain.deletedAt)
//         )
//       );
//     return c.json(domains);
//   })
//   .post("/", zValidator("json", z.object({ url: z.url() })), async (c) => {
//     const { url } = c.req.valid("json");
//     const domain = await c
//       .get("db")
//       .insert(schema.repoDomain)
//       .values({ repoId: c.get("repo").id, url })
//       .returning();
//     return c.json(domain);
//   })
//   .delete(
//     "/:domainId",
//     zValidator("param", z.object({ domainId: z.uuid() })),
//     async (c) => {
//       const { domainId } = c.req.valid("param");
//       await c
//         .get("db")
//         .update(schema.repoDomain)
//         .set({ deletedAt: new Date() })
//         .where(eq(schema.repoDomain.id, domainId));
//       return c.json({ success: true });
//     }
//   );
