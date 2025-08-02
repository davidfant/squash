import { requireActiveOrganization, requireAuth } from "@/auth/middleware";
import type { Database } from "@/database";
import * as schema from "@/database/schema";
import { zValidator } from "@hono/zod-validator";
import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";
import { and, desc, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import z from "zod";

export const repoProvidersRouter = new Hono<{
  Bindings: CloudflareBindings;
  Variables: { db: Database };
}>()
  .use(requireAuth, requireActiveOrganization)
  .get("/", async (c) => {
    const user = c.get("user");
    const db = c.get("db");
    const organizationId = c.get("organizationId");

    const providers = await db
      .select({
        id: schema.repoProvider.id,
        type: schema.repoProvider.type,
        createdAt: schema.repoProvider.createdAt,
      })
      .from(schema.repoProvider)
      .innerJoin(
        schema.member,
        eq(schema.repoProvider.organizationId, schema.member.organizationId)
      )
      .orderBy(desc(schema.repoProvider.createdAt))
      .where(
        and(
          eq(schema.repoProvider.organizationId, organizationId),
          isNull(schema.repoProvider.deletedAt),
          eq(schema.member.userId, user.id)
        )
      );

    return c.json(providers);
  })
  .get(
    "/:providerId",
    zValidator("param", z.object({ providerId: z.string() })),
    async (c) => {
      const { providerId } = c.req.valid("param");
      const organizationId = c.get("organizationId");
      const db = c.get("db");
      const user = c.get("user");

      const [provider] = await db
        .select({
          id: schema.repoProvider.id,
          type: schema.repoProvider.type,
          data: schema.repoProvider.data,
        })
        .from(schema.repoProvider)
        .innerJoin(
          schema.member,
          eq(schema.repoProvider.organizationId, schema.member.organizationId)
        )
        .where(
          and(
            eq(schema.repoProvider.id, providerId),
            eq(schema.repoProvider.organizationId, organizationId),
            isNull(schema.repoProvider.deletedAt),
            eq(schema.member.userId, user.id)
          )
        )
        .limit(1);

      if (!provider) {
        return c.json({ error: "Provider not found" }, 404);
      } else if (provider.type !== "github") {
        return c.json({ error: "Unsupported provider" }, 400);
      }

      const octokit = new Octokit({
        authStrategy: createAppAuth,
        auth: {
          appId: c.env.GITHUB_APP_ID,
          privateKey: c.env.GITHUB_APP_PRIVATE_KEY,
          installationId: provider.data.installationId,
        },
      });

      const allRepos = await octokit.paginate(
        octokit.rest.apps.listReposAccessibleToInstallation,
        { installation_id: provider.data.installationId, per_page: 100 }
      );

      const ownerMap = new Map<
        string,
        {
          id: string;
          name: string;
          avatarUrl: string;
          repos: Array<{
            id: string;
            name: string;
            createdAt: string;
            private: boolean;
          }>;
        }
      >();

      allRepos.forEach((repo) => {
        const ownerId = repo.owner.id.toString();
        const ownerName = repo.owner.login;

        if (!ownerMap.has(ownerId)) {
          ownerMap.set(ownerId, {
            id: ownerId,
            name: ownerName,
            avatarUrl: repo.owner.avatar_url,
            repos: [],
          });
        }

        ownerMap.get(ownerId)!.repos.push({
          id: repo.id.toString(),
          name: repo.name,
          createdAt: repo.created_at || new Date().toISOString(),
          private: repo.private,
        });
      });

      return c.json({
        id: provider.id,
        accounts: Array.from(ownerMap.values()),
      });
    }
  );
