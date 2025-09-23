import { type User } from "@/auth/middleware";
import type { Database } from "@/database";
import type {
  RepoBranchSandbox,
  RepoProviderData,
  RepoProviderType,
  RepoSnapshot,
} from "@/database/schema";
import * as schema from "@/database/schema";
import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";
import { and, desc, eq, isNull } from "drizzle-orm";
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

export const requireRepo = createMiddleware<
  {
    Bindings: CloudflareBindings;
    Variables: {
      db: Database;
      user: User;
      organizationId: string;
      repo: {
        id: string;
        name: string;
        url: string;
        defaultBranch: string;
        snapshot: RepoSnapshot;
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

  const [repo] = await db
    .select({
      id: schema.repo.id,
      name: schema.repo.name,
      url: schema.repo.url,
      defaultBranch: schema.repo.defaultBranch,
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
    .innerJoin(
      schema.member,
      eq(schema.repo.organizationId, schema.member.organizationId)
    )
    .where(
      and(
        eq(schema.repo.id, repoId),
        eq(schema.repo.organizationId, organizationId),
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

export const requireRepoBranch = createMiddleware<
  {
    Bindings: CloudflareBindings;
    Variables: {
      db: Database;
      user: User;
      organizationId: string;
      branch: {
        id: string;
        name: string;
        title: string;
        sandbox: RepoBranchSandbox | null;
        createdAt: Date;
        updatedAt: Date;
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
      title: schema.repoBranch.title,
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
