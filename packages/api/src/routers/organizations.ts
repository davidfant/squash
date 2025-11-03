import { requireAuth } from "@/auth/middleware";
import type { Database } from "@/database";
import * as schema from "@/database/schema/auth";
import { zValidator } from "@hono/zod-validator";
import { randomUUID } from "crypto";
import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import z from "zod";

const organizationSchema = z.object({
  name: z.string().min(1).max(128),
  slug: z
    .string()
    .min(3)
    .max(128)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  logo: z.string().url().optional(),
});

export const organizationsRouter = new Hono<{
  Bindings: CloudflareBindings;
  Variables: {
    db: Database;
    user: typeof schema.user.$inferSelect;
    session: {
      userId: string;
      activeOrganizationId: string | null;
    };
  };
}>()
  .use("*", requireAuth)
  .get("/", async (c) => {
    const db = c.get("db");
    const user = c.get("user");

    const organizations = await db
      .select({
        id: schema.organization.id,
        name: schema.organization.name,
        slug: schema.organization.slug,
        logo: schema.organization.logo,
        role: schema.member.role,
      })
      .from(schema.organization)
      .innerJoin(
        schema.member,
        eq(schema.member.organizationId, schema.organization.id)
      )
      .where(eq(schema.member.userId, user.id))
      .orderBy(asc(schema.member.createdAt));

    return c.json({ organizations });
  })
  .get("/active", async (c) => {
    const db = c.get("db");
    const session = c.get("session");

    if (!session.activeOrganizationId) {
      return c.json({ organization: null });
    }

    const [organization] = await db
      .select()
      .from(schema.organization)
      .where(eq(schema.organization.id, session.activeOrganizationId))
      .limit(1);

    return c.json({ organization: organization ?? null });
  })
  .post("/", zValidator("json", organizationSchema), async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const { name, slug, logo } = c.req.valid("json");

    const organizationId = randomUUID();
    const now = new Date();

    await db.transaction(async (tx) => {
      await tx
        .insert(schema.organization)
        .values({
          id: organizationId,
          name,
          slug,
          logo,
          createdAt: now,
        })
        .execute();

      await tx
        .insert(schema.member)
        .values({
          id: randomUUID(),
          organizationId,
          userId: user.id,
          role: "owner",
          createdAt: now,
        })
        .execute();

      await tx
        .update(schema.user)
        .set({ activeOrganizationId: organizationId, updatedAt: now })
        .where(eq(schema.user.id, user.id))
        .execute();
    });

    c.set("session", {
      userId: user.id,
      activeOrganizationId: organizationId,
    });

    return c.json({
      organization: {
        id: organizationId,
        name,
        slug,
        logo: logo ?? null,
      },
    });
  })
  .patch(
    "/active",
    zValidator(
      "json",
      z.object({ organizationId: z.string().uuid("Invalid organization id") })
    ),
    async (c) => {
      const db = c.get("db");
      const user = c.get("user");
      const { organizationId } = c.req.valid("json");

      const membership = await db
        .select()
        .from(schema.member)
        .where(
          and(
            eq(schema.member.userId, user.id),
            eq(schema.member.organizationId, organizationId)
          )
        )
        .limit(1)
        .then(([member]) => member);

      if (!membership) {
        return c.json({ error: "Not a member of organization" }, 403);
      }

      await db
        .update(schema.user)
        .set({
          activeOrganizationId: organizationId,
          updatedAt: new Date(),
        })
        .where(eq(schema.user.id, user.id))
        .execute();

      c.set("session", {
        userId: user.id,
        activeOrganizationId: organizationId,
      });

      return c.json({ success: true });
    }
  );
