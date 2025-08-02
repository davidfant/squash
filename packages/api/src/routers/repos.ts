import { requireActiveOrganization, requireAuth } from "@/auth/middleware";
import type { Database } from "@/database";
import * as schema from "@/database/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";

export const reposRouter = new Hono<{
  Bindings: CloudflareBindings;
  Variables: { db: Database };
}>()
  .use(requireAuth)
  .get("/", requireActiveOrganization, async (c) => {
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
          eq(schema.member.userId, user.id)
        )
      );

    return c.json(repos);
  });
