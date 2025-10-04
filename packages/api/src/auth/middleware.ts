import type { Database } from "@/database";
import type { MemberRole } from "@/database/schema/auth";
import * as schema from "@/database/schema/auth";
import { and, eq, type InferSelectModel } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { createAuth, type Auth } from ".";

export const authMiddleware = createMiddleware<{
  Bindings: CloudflareBindings;
  Variables: { auth: Auth };
}>(async (c, next) => {
  c.set("auth", createAuth(c.env));
  await next();
});

export type User = InferSelectModel<typeof schema.user>;
export type Session = InferSelectModel<typeof schema.session>;

export const requireAuth = createMiddleware<{
  Variables: { auth: Auth; user: User; session: Session };
}>(async (c, next) => {
  const s = await c.get("auth").api.getSession({ headers: c.req.raw.headers });
  if (!s) return c.json({ error: "Unauthorized" }, 401);
  c.set("user", s.user as User);
  c.set("session", s.session as Session);
  await next();
});

export const requireActiveOrganization = createMiddleware<{
  Variables: { session: Session; organizationId: string };
}>(async (c, next) => {
  const session = c.get("session");
  if (!session?.activeOrganizationId) {
    return c.json({ error: "No active organization" }, 400);
  }
  c.set("organizationId", session.activeOrganizationId);
  await next();
});

export const requireRole = (...roles: MemberRole[]) =>
  createMiddleware<{
    Variables: { db: Database; session: Session; role: MemberRole };
  }>(async (c, next) => {
    const session = c.get("session");
    if (!session?.activeOrganizationId) {
      return c.json({ error: "No active organization" }, 400);
    }

    const member = await c
      .get("db")
      .select()
      .from(schema.member)
      .where(
        and(
          eq(schema.member.userId, session.userId),
          eq(schema.member.organizationId, session.activeOrganizationId)
        )
      )
      .limit(1)
      .then(([member]) => member);
    if (!member || !roles.includes(member.role)) {
      return c.json({ error: "Insufficient permissions" }, 403);
    }
    c.set("role", member.role);
    await next();
  });
