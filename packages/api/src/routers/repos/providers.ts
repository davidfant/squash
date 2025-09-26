import { requireActiveOrganization, requireAuth } from "@/auth/middleware";
import type { Database } from "@/database";
import * as schema from "@/database/schema";
import { zSandboxSnapshotConfig } from "@/sandbox/zod";
import { RepoService } from "@/services/repoService";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import z from "zod";
import { requireRepoProvider } from "./middleware";

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
  .post(
    "/:providerId/detect-framework",
    zValidator("param", z.object({ providerId: z.string() })),
    zValidator("json", z.object({ repoId: z.string() })),
    requireRepoProvider,
    async (c) => {
      const { repoId } = c.req.valid("json");
      const provider = c.get("provider");

      try {
        // Get repository details from provider
        const allRepos = await provider.octokit.paginate(
          provider.octokit.rest.apps.listReposAccessibleToInstallation,
          { installation_id: provider.data.installationId }
        );

        const targetRepo = allRepos.find((r) => r.id.toString() === repoId);
        if (!targetRepo) {
          return c.json(
            { error: "Repository not found or not accessible" },
            404
          );
        }

        // Use RepoService to detect framework
        const { framework, snapshot } =
          await RepoService.detectAndApplyFramework({
            repo: {
              url: targetRepo.clone_url,
              defaultBranch: targetRepo.default_branch,
            },
            provider: provider,
            env: c.env,
          });

        return c.json({
          framework: framework,
          snapshot: snapshot,
        });
      } catch (error) {
        console.error("Error detecting framework:", error);
        return c.json({ error: "Failed to detect framework" }, 500);
      }
    }
  )
  .get(
    "/:providerId",
    zValidator("param", z.object({ providerId: z.string() })),
    requireRepoProvider,
    async (c) => {
      const { providerId } = c.req.valid("param");
      const organizationId = c.get("organizationId");
      const db = c.get("db");
      const provider = c.get("provider");

      const [allRepos, importedRepos] = await Promise.all([
        provider.octokit.paginate(
          provider.octokit.rest.apps.listReposAccessibleToInstallation,
          {
            installation_id: provider.data.installationId,
            per_page: 100,
          }
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
          ),
      ]);

      const importedRepoIds = new Set(
        importedRepos.map((repo) => repo.externalId)
      );

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
    "/:providerId/repos",
    zValidator("param", z.object({ providerId: z.string() })),
    zValidator(
      "json",
      z.object({ repoId: z.string(), snapshot: zSandboxSnapshotConfig })
    ),
    requireRepoProvider,
    async (c) => {
      const { providerId } = c.req.valid("param");
      const { repoId, snapshot } = c.req.valid("json");
      const organizationId = c.get("organizationId");
      const db = c.get("db");
      const provider = c.get("provider");

      try {
        const allRepos = await provider.octokit.paginate(
          provider.octokit.rest.apps.listReposAccessibleToInstallation,
          { installation_id: provider.data.installationId }
        );

        const targetRepo = allRepos.find((r) => r.id.toString() === repoId);
        if (!targetRepo) {
          return c.json(
            { error: "Repository not found or not accessible" },
            404
          );
        }

        const existing = await db.query.repo.findFirst({
          where: (repo, { eq, isNull }) =>
            and(
              eq(repo.externalId, repoId),
              eq(repo.providerId, providerId),
              eq(repo.organizationId, organizationId),
              isNull(repo.deletedAt)
            ),
        });

        if (existing) {
          return c.json({ error: "Repository already imported" }, 409);
        }

        const [newRepo] = await db
          .insert(schema.repo)
          .values({
            name: targetRepo.name,
            url: targetRepo.clone_url,
            defaultBranch: targetRepo.default_branch,
            private: targetRepo.private,
            providerId: providerId,
            externalId: repoId,
            organizationId: organizationId,
            snapshot: snapshot,
          })
          .returning();

        return c.json(newRepo!);
      } catch (error) {
        console.error("Error importing repository:", error);
        return c.json({ error: "Failed to import repository" }, 500);
      }
    }
  );
