import { requireActiveOrganization, requireAuth } from "@/auth/middleware";
import type { Database } from "@/database";
import * as schema from "@/database/schema";
import { zValidator } from "@hono/zod-validator";
import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";
import { and, desc, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import z from "zod";

export const reposRouter = new Hono<{
  Bindings: CloudflareBindings;
  Variables: { db: Database };
}>()
  .use(requireAuth, requireActiveOrganization)
  .get("/", async (c) => {
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
  })
  .get("/providers", async (c) => {
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
    "/providers/:providerId",
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

      const [allRepos, importedRepos] = await Promise.all([
        octokit.paginate(
          octokit.rest.apps.listReposAccessibleToInstallation,
          { installation_id: provider.data.installationId, per_page: 100 }
        ),
        db
          .select({
            externalId: schema.repo.externalId,
          })
          .from(schema.repo)
          .where(
            and(
              eq(schema.repo.providerId, providerId),
              eq(schema.repo.organizationId, organizationId),
              isNull(schema.repo.deletedAt)
            )
          )
      ]);

      const importedRepoIds = new Set(importedRepos.map(repo => repo.externalId));

      const accountsMap = allRepos.reduce(
        (acc, repo) => {
          const ownerId = repo.owner.id.toString();
          const ownerName = repo.owner.login;

          if (!acc.has(ownerId)) {
            acc.set(ownerId, {
              id: ownerId,
              name: ownerName,
              avatarUrl: repo.owner.avatar_url,
              repos: [],
            });
          }

          acc.get(ownerId)!.repos.push({
            id: repo.id.toString(),
            name: repo.name,
            createdAt: repo.created_at || new Date().toISOString(),
            private: repo.private,
            imported: importedRepoIds.has(repo.id.toString()),
          });

          return acc;
        },
        new Map<
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
              imported: boolean;
            }>;
          }
        >()
      );

      const accounts = Array.from(accountsMap.values());
      return c.json({ id: provider.id, accounts });
    }
  )
  .post(
    "/providers/:providerId/repos",
    zValidator("param", z.object({ providerId: z.string() })),
    zValidator("json", z.object({ repoId: z.string() })),
    async (c) => {
      const { providerId } = c.req.valid("param");
      const { repoId } = c.req.valid("json");
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

      try {
        // Get all accessible repos to find the target repo
        const allRepos = await octokit.paginate(
          octokit.rest.apps.listReposAccessibleToInstallation,
          { installation_id: provider.data.installationId }
        );

        const targetRepo = allRepos.find(repo => repo.id.toString() === repoId);
        if (!targetRepo) {
          return c.json({ error: "Repository not found or not accessible" }, 404);
        }

        // Check if repo already exists
        const [existingRepo] = await db
          .select({ id: schema.repo.id })
          .from(schema.repo)
          .where(
            and(
              eq(schema.repo.externalId, repoId),
              eq(schema.repo.providerId, providerId),
              eq(schema.repo.organizationId, organizationId),
              isNull(schema.repo.deletedAt)
            )
          )
          .limit(1);

        if (existingRepo) {
          return c.json({ error: "Repository already imported" }, 409);
        }

        // Insert the repo
        const [newRepo] = await db
          .insert(schema.repo)
          .values({
            name: targetRepo.name,
            url: targetRepo.clone_url,
            defaultBranch: targetRepo.default_branch || "main",
            private: targetRepo.private,
            providerId: providerId,
            externalId: repoId,
            organizationId: organizationId,
          })
          .returning({
            id: schema.repo.id,
            name: schema.repo.name,
            url: schema.repo.url,
            defaultBranch: schema.repo.defaultBranch,
            private: schema.repo.private,
            createdAt: schema.repo.createdAt,
          });

        return c.json(newRepo);
      } catch (error) {
        console.error("Error importing repository:", error);
        return c.json({ error: "Failed to import repository" }, 500);
      }
    }
  );
