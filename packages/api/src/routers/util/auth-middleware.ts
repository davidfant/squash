import type { Database } from "@/database";
import * as schema from "@/database/schema";
import type { ClerkOrganizationRole } from "@/types";
import { getAuth } from "@hono/clerk-auth";
import { and, eq, or } from "drizzle-orm";
import { createMiddleware } from "hono/factory";

export const requireAuth = createMiddleware<{
  Bindings: CloudflareBindings;
  Variables: { userId: string; organizationId: string };
}>(async (c, next) => {
  const auth = getAuth(c);

  if (!auth?.userId) return c.json({ error: "Unauthorized" }, 401);
  c.set("userId", auth.userId);
  c.set("organizationId", auth.orgId!);
  await next();
});

export const requireRole = (...roles: ClerkOrganizationRole[]) =>
  createMiddleware(async (c, next) => {
    const auth = getAuth(c);
    if (!roles.some((role) => auth?.orgRole?.includes(role))) {
      return c.json({ error: "Insufficient permissions" }, 403);
    }

    await next();
  });

export const requireRepoBranch = createMiddleware<
  { Variables: { db: Database } },
  string,
  { out: { param: { branchId: string } } }
>(async (c, next) => {
  const { branchId } = c.req.valid("param");
  const auth = getAuth(c);
  const branch = await c
    .get("db")
    .select()
    .from(schema.repoBranch)
    .innerJoin(schema.repo, eq(schema.repoBranch.repoId, schema.repo.id))
    .where(
      and(
        eq(schema.repoBranch.id, branchId),
        eq(schema.repo.organizationId, auth?.orgId!)
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
