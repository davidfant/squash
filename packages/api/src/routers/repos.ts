import {
  requireActiveOrganization,
  requireAuth,
  type User,
} from "@/auth/middleware";
import type { Database } from "@/database";
import type {
  RepoProviderData,
  RepoProviderType,
  RepoSnapshot,
} from "@/database/schema";
import * as schema from "@/database/schema";
import { createFlyApp, createFlyMachine } from "@/lib/flyio";
import { google } from "@ai-sdk/google";
import { zValidator } from "@hono/zod-validator";
import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";
import { generateText } from "ai";
import { randomUUID } from "crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import kebabCase from "lodash.kebabcase";
import z from "zod";
import { zMessageInput } from "./threads";

export const requireRepoProvider = createMiddleware<
  {
    Bindings: CloudflareBindings;
    Variables: {
      db: Database;
      user: User;
      organizationId: string;
      provider: {
        id: string;
        type: RepoProviderType;
        data: RepoProviderData;
        octokit: Octokit;
      };
    };
  },
  string,
  { out: { param: { providerId: string } } }
>(async (c, next) => {
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

  c.set("provider", { ...provider, octokit });
  await next();
});

export const requireRepo = createMiddleware<
  {
    Bindings: CloudflareBindings;
    Variables: {
      db: Database;
      user: User;
      organizationId: string;
      repo: { id: string; name: string; snapshot: RepoSnapshot };
    };
  },
  string,
  { out: { param: { repoId: string } } }
>(async (c, next) => {
  const { repoId } = c.req.valid("param");
  const organizationId = c.get("organizationId");
  const db = c.get("db");
  const user = c.get("user");

  const [repo] = await db
    .select({
      id: schema.repo.id,
      name: schema.repo.name,
      snapshot: schema.repo.snapshot,
    })
    .from(schema.repo)
    .innerJoin(
      schema.repoProvider,
      eq(schema.repo.providerId, schema.repoProvider.id)
    )
    .innerJoin(
      schema.member,
      eq(schema.repoProvider.organizationId, schema.member.organizationId)
    )
    .where(
      and(
        eq(schema.repo.id, repoId),
        eq(schema.repoProvider.organizationId, organizationId),
        isNull(schema.repo.deletedAt),
        eq(schema.member.userId, user.id)
      )
    )
    .limit(1);

  if (!repo) {
    return c.json({ error: "Repository not found" }, 404);
  }

  c.set("repo", repo);
  await next();
});

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
    "/providers/:providerId/repos",
    zValidator("param", z.object({ providerId: z.string() })),
    zValidator("json", z.object({ repoId: z.string() })),
    requireRepoProvider,
    async (c) => {
      const { providerId } = c.req.valid("param");
      const { repoId } = c.req.valid("json");
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
            snapshot: {
              type: "docker",
              port: 3000,
              image: "node:20-alpine",
              entrypoint:
                "npm install && npm run vite --host 0.0.0.0 --port 3000",
            },
          })
          .returning();

        return c.json(newRepo!);
      } catch (error) {
        console.error("Error importing repository:", error);
        return c.json({ error: "Failed to import repository" }, 500);
      }
    }
  )
  .post(
    "/:repoId/branches",
    zValidator("param", z.object({ repoId: z.string().uuid() })),
    zValidator("json", zMessageInput),
    requireRepo,
    async (c) => {
      const { repoId } = c.req.valid("param");
      const messageInput = c.req.valid("json");
      const user = c.get("user");
      const db = c.get("db");

      try {
        const ipAddress =
          c.req.header("cf-connecting-ip") ??
          c.req.header("x-forwarded-for") ??
          c.req.raw.headers.get("x-forwarded-for");

        const thread = await db
          .insert(schema.messageThread)
          .values({ ipAddress })
          .returning()
          .then(([thread]) => thread!);

        await db.insert(schema.message).values({
          id: messageInput.id,
          role: "user",
          content: messageInput.content,
          threadId: thread.id,
          status: "pending",
        });

        const textContent = messageInput.content
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join(" ");

        const { text: name } = await generateText({
          model: google("gemini-2.5-flash"),
          prompt: `Generate a concise Jira ticket name (title case, max 50 chars) for this feature request: "${textContent}". Only return the branch name, nothing else.`,
          providerOptions: {
            google: { thinkingConfig: { thinkingBudget: 0 } },
          },
        });

        const branchId = randomUUID();
        const slug = `${kebabCase(name)}-${branchId.split("-")[0]}`;

        const flyApp = await createFlyApp(
          slug,
          c.env.FLY_API_KEY,
          c.env.FLY_ORG_SLUG
        );
        const flyMachine = await createFlyMachine(slug, c.env.FLY_API_KEY);

        // Create repo branch record
        const [repoBranch] = await db
          .insert(schema.repoBranch)
          .values({
            id: branchId,
            name,
            slug,
            sandbox: {
              type: "flyio",
              appId: flyApp.id,
              machineId: flyMachine.id,
              url: `https://${slug}.fly.dev`,
            },
            threadId: thread.id,
            repoId: repoId,
            createdBy: user.id,
          })
          .returning();

        return c.json(repoBranch!);
      } catch (error) {
        console.error("Error creating repo branch:", error);
        return c.json({ error: "Failed to create repo branch" }, 500);
      }
    }
  )
  .get(
    "/:repoId/branches",
    zValidator("param", z.object({ repoId: z.string().uuid() })),
    async (c) => {
      const { repoId } = c.req.valid("param");
      const user = c.get("user");
      const db = c.get("db");
      const organizationId = c.get("organizationId");

      const branches = await db
        .select({
          id: schema.repoBranch.id,
          name: schema.repoBranch.name,
          createdAt: schema.repoBranch.createdAt,
          updatedAt: schema.repoBranch.updatedAt,
          createdBy: {
            id: schema.user.id,
            name: schema.user.name,
            image: schema.user.image,
          },
        })
        .from(schema.repo)
        .leftJoin(
          schema.repoBranch,
          eq(schema.repo.id, schema.repoBranch.repoId)
        )
        .innerJoin(schema.user, eq(schema.repoBranch.createdBy, schema.user.id))
        .innerJoin(
          schema.member,
          eq(schema.repo.organizationId, schema.member.organizationId)
        )
        .where(
          and(
            eq(schema.repo.id, repoId),
            eq(schema.repo.organizationId, organizationId),
            isNull(schema.repo.deletedAt),
            eq(schema.member.userId, user.id),
            isNull(schema.repoBranch.deletedAt)
          )
        )
        .orderBy(desc(schema.repoBranch.createdAt));

      return c.json(branches);
    }
  )
  .get(
    "/branches/:branchId",
    zValidator("param", z.object({ branchId: z.string().uuid() })),
    async (c) => {
      const { branchId } = c.req.valid("param");
      const user = c.get("user");
      const db = c.get("db");
      const organizationId = c.get("organizationId");

      const [branch] = await db
        .select({
          id: schema.repoBranch.id,
          name: schema.repoBranch.name,
          sandbox: schema.repoBranch.sandbox,
          createdAt: schema.repoBranch.createdAt,
          updatedAt: schema.repoBranch.updatedAt,
          createdBy: {
            id: schema.user.id,
            name: schema.user.name,
            image: schema.user.image,
          },
        })
        .from(schema.repo)
        .innerJoin(
          schema.repoBranch,
          eq(schema.repo.id, schema.repoBranch.repoId)
        )
        .innerJoin(schema.user, eq(schema.repoBranch.createdBy, schema.user.id))
        .innerJoin(
          schema.member,
          eq(schema.repo.organizationId, schema.member.organizationId)
        )
        .where(
          and(
            eq(schema.repoBranch.id, branchId),
            eq(schema.repo.organizationId, organizationId),
            isNull(schema.repo.deletedAt),
            eq(schema.member.userId, user.id),
            isNull(schema.repoBranch.deletedAt)
          )
        )
        .orderBy(desc(schema.repoBranch.createdAt));

      if (!branch) return c.json({ error: "Branch not found" }, 404);
      return c.json(branch);
    }
  );
