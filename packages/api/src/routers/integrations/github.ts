import { requireActiveOrganization, requireAuth } from "@/auth/middleware";
import type { Database } from "@/database";
import * as schema from "@/database/schema";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import z from "zod";

// TODO: make a version of this that doesn't require auth and actually creates a user (needs "Request user authorization" in the Github app settings)
export const githubRouter = new Hono<{
  Bindings: CloudflareBindings;
  Variables: { db: Database };
}>()
  .get(
    "/connect",
    zValidator("query", z.object({ callbackUrl: z.string().url().optional() })),
    requireAuth,
    requireActiveOrganization,
    async (c) => {
      const db = c.get("db");
      const organizationId = c.get("organizationId");
      const query = c.req.valid("query");
      const callbackUrl = query.callbackUrl?.startsWith("/")
        ? `${c.env.APP_URL}${query.callbackUrl}`
        : query.callbackUrl;

      const [verification] = await db
        .insert(schema.repoProviderVerification)
        .values({ type: "github", organizationId, callbackUrl })
        .returning();

      const url = `https://github.com/apps/${
        c.env.GITHUB_APP_SLUG
      }/installations/new/?state=${verification!.id}`;
      return c.redirect(url);
    }
  )
  .get(
    "/setup",
    zValidator(
      "query",
      z.object({
        installation_id: z.string(),
        setup_action: z.enum(["install", "upgrade"]),
        state: z.string().uuid(),
      })
    ),
    async (c) => {
      const db = c.get("db");
      const query = c.req.valid("query");

      const verification = await db.query.repoProviderVerification.findFirst({
        where: eq(schema.repoProviderVerification.id, query.state!),
      });
      if (!verification) {
        return c.json({ error: "Invalid state" }, 400);
      }

      // TODO: upsert?
      const [provider] = await db
        .insert(schema.repoProvider)
        .values({
          type: "github",
          organizationId: verification.organizationId,
          data: { installationId: query.installation_id },
        })
        .returning();

      return c.redirect(
        verification.callbackUrl ?? `${c.env.APP_URL}/new/repo/${provider!.id}`
      );
    }
  );
