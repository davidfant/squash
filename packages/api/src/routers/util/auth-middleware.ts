import type { Database } from "@/database";
import * as schema from "@/database/schema";
import type { ClerkOrganizationRole } from "@/types";
import { createClerkClient, type AuthObject } from "@clerk/backend";
import { and, eq, or } from "drizzle-orm";
import { createMiddleware } from "hono/factory";

// type Auth = NonNullable<ReturnType<RequestState["toAuth"]>>;
export interface Auth {
  userId: string;
  orgId: string;
  orgRole: ClerkOrganizationRole;
}

export const loadAuth = createMiddleware<{
  Bindings: CloudflareBindings;
  Variables: {
    auth: AuthObject | null;
    userId: string | null;
    organizationId: string | null;
  };
}>(async (c, next) => {
  const clerk = createClerkClient({
    secretKey: c.env.CLERK_SECRET_KEY,
    publishableKey: c.env.CLERK_PUBLISHABLE_KEY,
  });

  const requestState = await clerk.authenticateRequest(c.req.raw, {
    secretKey: c.env.CLERK_SECRET_KEY,
    publishableKey: c.env.CLERK_PUBLISHABLE_KEY,
  });

  const auth = requestState.toAuth();
  c.set("auth", auth);
  c.set("userId", auth?.userId ?? null);
  c.set("organizationId", auth?.orgId ?? null);

  await next();
});

export const requireAuth = createMiddleware<{
  Bindings: CloudflareBindings;
  Variables: {
    auth: Auth | null;
    userId: string;
    organizationId: string;
  };
}>(async (c, next) => {
  const auth = c.get("auth");

  if (!auth?.userId) return c.json({ error: "Unauthorized" }, 401);
  c.set("userId", auth.userId);
  c.set("organizationId", auth.orgId!);
  await next();
});

export const requireRole = (...roles: ClerkOrganizationRole[]) =>
  createMiddleware<{
    Variables: { auth: Auth };
  }>(async (c, next) => {
    const auth = c.get("auth");
    if (!roles.some((role) => auth.orgRole?.includes(role))) {
      return c.json({ error: "Insufficient permissions" }, 403);
    }

    await next();
  });

export const requireRepoBranch = createMiddleware<
  { Variables: { db: Database; auth: Auth } },
  string,
  { out: { param: { branchId: string } } }
>(async (c, next) => {
  const { branchId } = c.req.valid("param");
  const auth = c.get("auth");
  const branch = await c
    .get("db")
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
  await next();
});

export const requireRepo = createMiddleware<
  { Variables: { db: Database; organizationId: string | null } },
  string,
  { out: { param: { repoId: string } } }
>(async (c, next) => {
  const { repoId } = c.req.valid("param");
  const organizationId = c.get("organizationId");
  const repo = await c
    .get("db")
    .select({ id: schema.repo.id })
    .from(schema.repo)
    .where(
      and(
        eq(schema.repo.id, repoId),
        or(
          eq(schema.repo.organizationId, organizationId!),
          eq(schema.repo.public, true)
        )
      )
    )
    .then(([repo]) => repo);
  if (!repo) return c.json({ error: "Repo not found" }, 404);
  await next();
});
