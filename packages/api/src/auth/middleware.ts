import {
  ensureUser,
  createClerk,
  getUserWithActiveOrganization,
} from "@/auth";
import type { Database } from "@/database";
import type { MemberRole } from "@/database/schema/auth";
import * as schema from "@/database/schema/auth";
import { and, eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import type { ClerkClient } from "@clerk/backend";

export const authMiddleware = createMiddleware<{
  Bindings: CloudflareBindings;
  Variables: { clerk: ClerkClient };
}>(async (c, next) => {
  c.set("clerk", createClerk(c.env));
  await next();
});

export type User = typeof schema.user.$inferSelect;
export type Session = {
  userId: string;
  activeOrganizationId: string | null;
};

export const requireAuth = createMiddleware<{
  Bindings: CloudflareBindings;
  Variables: {
    clerk: ClerkClient;
    db: Database;
    user: User;
    session: Session;
  };
}>(async (c, next) => {
  const clerk = c.get("clerk");
  const db = c.get("db");
  const authorization =
    c.req.header("authorization") ?? c.req.header("Authorization");

  if (authorization?.startsWith("Bearer ")) {
    const token = authorization.slice("Bearer ".length).trim();
    if (token) {
      const sessionRecord = await db
        .select()
        .from(schema.session)
        .where(eq(schema.session.token, token))
        .limit(1)
        .then(([record]) => record);

      if (
        sessionRecord &&
        sessionRecord.expiresAt &&
        sessionRecord.expiresAt > new Date()
      ) {
        const user = await getUserWithActiveOrganization(
          db,
          sessionRecord.userId
        );
        if (user) {
          c.set("user", user);
          c.set("session", {
            userId: user.id,
            activeOrganizationId: user.activeOrganizationId ?? null,
          });
          return next();
        }
      }
    }
  }

  const authState = await clerk.authenticateRequest({ request: c.req.raw });
  if (!authState.isAuthenticated || !authState.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const user = await ensureUser({
    db,
    clerk,
    clerkUserId: authState.userId,
  });

  const session: Session = {
    userId: user.id,
    activeOrganizationId: user.activeOrganizationId ?? null,
  };

  c.set("user", user);
  c.set("session", session);
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
