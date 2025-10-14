import { type User } from "@/auth/middleware";
import type { Database } from "@/database";
import type {
  RepoProviderData,
  RepoProviderType,
  RepoSuggestion,
} from "@/database/schema";
import * as schema from "@/database/schema";
import type { Sandbox } from "@/sandbox/types";
import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";
import { and, desc, eq, isNotNull, isNull, or } from "drizzle-orm";
import { createMiddleware } from "hono/factory";

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

export const requireRepo = (mode: "read" | "write") =>
  createMiddleware<
    {
      Bindings: CloudflareBindings;
      Variables: {
        db: Database;
        user: User | undefined;
        organizationId: string | undefined;
        repo: {
          id: string;
          name: string;
          gitUrl: string;
          imageUrl: string | null;
          previewUrl: string | null;
          suggestions: RepoSuggestion[] | null;
          defaultBranch: string;
          snapshot: Sandbox.Snapshot.Config.Any;
          organizationId: string;
          provider: {
            id: string;
            type: RepoProviderType;
            data: RepoProviderData;
          } | null;
        };
      };
    },
    string,
    { out: { param: { repoId: string } } }
  >(async (c, next) => {
    const { repoId } = c.req.valid("param");
    const organizationId = c.get("organizationId");
    const db = c.get("db");
    const user = c.get("user");

    if (mode === "write" && (!user || !organizationId)) {
      return c.json({ error: "User or organization not found" }, 404);
    }

    const q = db
      .select({
        id: schema.repo.id,
        name: schema.repo.name,
        gitUrl: schema.repo.gitUrl,
        imageUrl: schema.repo.imageUrl,
        previewUrl: schema.repo.previewUrl,
        suggestions: schema.repo.suggestions,
        defaultBranch: schema.repo.defaultBranch,
        organizationId: schema.repo.organizationId,
        snapshot: schema.repo.snapshot,
        provider: {
          id: schema.repoProvider.id,
          type: schema.repoProvider.type,
          data: schema.repoProvider.data,
        },
      })
      .from(schema.repo)
      .leftJoin(
        schema.repoProvider,
        eq(schema.repo.providerId, schema.repoProvider.id)
      )
      .limit(1);

    const [repo] =
      user && organizationId
        ? await q
            .leftJoin(
              schema.member,
              and(
                eq(schema.repo.organizationId, organizationId),
                eq(schema.member.userId, user.id)
              )
            )
            .where(
              and(
                eq(schema.repo.id, repoId),
                isNull(schema.repo.deletedAt),
                or(
                  isNotNull(schema.member.userId),
                  eq(schema.repo.private, false)
                )
              )
            )
        : await q.where(
            and(
              eq(schema.repo.id, repoId),
              isNull(schema.repo.deletedAt),
              eq(schema.repo.private, false)
            )
          );

    if (!repo) {
      return c.json({ error: "Repository not found" }, 404);
    }

    c.set("repo", repo);
    await next();
  });

export const requireRepoBranch = createMiddleware<
  {
    Bindings: CloudflareBindings;
    Variables: {
      db: Database;
      user: User;
      organizationId: string;
      branch: {
        id: string;
        repoId: string;
        name: string;
        title: string;
        createdAt: Date;
        updatedAt: Date;
        deployment: { url: string; sha: string } | null;
        createdBy: { id: string; name: string; image: string | null };
      };
    };
  },
  string,
  { out: { param: { branchId: string } } }
>(async (c, next) => {
  const { branchId } = c.req.valid("param");
  const db = c.get("db");
  const user = c.get("user");
  const organizationId = c.get("organizationId");

  const [branch] = await db
    .select({
      id: schema.repoBranch.id,
      repoId: schema.repoBranch.repoId,
      title: schema.repoBranch.title,
      name: schema.repoBranch.name,
      deployment: schema.repoBranch.deployment,
      createdAt: schema.repoBranch.createdAt,
      updatedAt: schema.repoBranch.updatedAt,
      createdBy: {
        id: schema.user.id,
        name: schema.user.name,
        image: schema.user.image,
      },
    })
    .from(schema.repo)
    .innerJoin(schema.repoBranch, eq(schema.repo.id, schema.repoBranch.repoId))
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

  c.set("branch", branch);
  await next();
});
