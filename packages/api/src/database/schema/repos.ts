import { relations, type InferEnum } from "drizzle-orm";
import {
  boolean,
  index,
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { organization, user } from "./auth";
import { messageThread } from "./messages";

export interface RepoSnapshot {
  type: "docker";
  port: number;
  image: string;
  workdir: string;
  cmd: { prepare?: string; entrypoint: string };
}

export interface RepoBranchSandbox {
  type: "flyio";
  appId: string;
  machineId: string;
  url: string;
  workdir: string;
}

export const repoProviderType = pgEnum("repo_provider_type", ["github"]);
export type RepoProviderType = InferEnum<typeof repoProviderType>;

export interface RepoProviderData {
  installationId: string;
}

export const repo = pgTable("repo", {
  id: uuid().primaryKey().defaultRandom(),
  url: text().notNull(),
  name: text().notNull(),
  snapshot: json("snapshot").$type<RepoSnapshot>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
  defaultBranch: text("default_branch").notNull(),
  private: boolean("private").notNull(),
  providerId: uuid("provider_id").references(() => repoProvider.id),
  externalId: text("external_id"),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id),
});

export const repoBranch = pgTable(
  "repo_branch",
  {
    id: uuid().primaryKey().defaultRandom(),
    title: text().notNull(),
    name: text().notNull(),
    sandbox: json("sandbox").$type<RepoBranchSandbox>().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => messageThread.id),
    repoId: uuid("repo_id")
      .notNull()
      .references(() => repo.id),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => user.id),
    // previewImageUrl: text("preview_image_url"),
  },
  (table) => [index("workflow_thread_id_index").on(table.threadId)]
);

export const repoProvider = pgTable("repo_provider", {
  id: uuid().primaryKey().defaultRandom(),
  type: repoProviderType("type").notNull(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id),
  data: json("data").$type<RepoProviderData>().notNull(),
  // scopes: text("scopes").notNull(),
  // token: text().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const repoProviderVerification = pgTable("repo_provider_verification", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: repoProviderType("type").notNull(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id),
  callbackUrl: text("callback_url"),
});

export const repoRelations = relations(repo, ({ one }) => ({
  provider: one(repoProvider, {
    fields: [repo.providerId],
    references: [repoProvider.id],
  }),
}));

export const branchesRelations = relations(repoBranch, ({ one }) => ({
  thread: one(messageThread, {
    fields: [repoBranch.threadId],
    references: [messageThread.id],
  }),
  repo: one(repo, { fields: [repoBranch.repoId], references: [repo.id] }),
}));

export const reposRelations = relations(repo, ({ many, one }) => ({
  branches: many(repoBranch),
  organization: one(organization, {
    fields: [repo.organizationId],
    references: [organization.id],
  }),
}));
