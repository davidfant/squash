import type { Sandbox } from "@/sandbox/types";
import { relations, type InferEnum } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { messageThread } from "./messages";

export const sandboxProviderType = pgEnum("sandbox_provider_type", [
  "cloudflare",
  "fly",
  "vercel",
  "daytona",
]);
export type SandboxProviderType = InferEnum<typeof sandboxProviderType>;

export interface RepoProviderData {
  installationId: string;
}

export const repoSuggestionColors = [
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
  "gray",
] as const;

export type RepoSuggestionColor = (typeof repoSuggestionColors)[number];

export interface RepoSuggestion {
  title: string;
  prompt: string;
  icon: string;
  color: RepoSuggestionColor;
}

export const repo = pgTable(
  "repo",
  {
    id: uuid().primaryKey().defaultRandom(),
    previewUrl: text(),
    imageUrl: text(),
    gitUrl: text().notNull(),
    name: text().notNull(),
    suggestions: jsonb("suggestions").$type<RepoSuggestion[] | null>(),
    snapshot: jsonb("snapshot").$type<Sandbox.Snapshot.Config.Any>().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
    defaultBranch: text("default_branch").notNull(),
    public: boolean("public").notNull(),
    // hidden: boolean("hidden").notNull().default(false),
    organizationId: text("organization_id").notNull(),
    createdBy: text("created_by").notNull(),
  },
  (table) => [
    index("repo_created_by_index").on(table.createdBy),
    index("repo_organization_id_index").on(table.organizationId),
  ]
);

export const repoBranch = pgTable(
  "repo_branch",
  {
    id: uuid().primaryKey().defaultRandom(),
    title: text().notNull(),
    name: text().notNull(),
    sandboxProvider: sandboxProviderType("sandbox_provider")
      .notNull()
      .default("cloudflare"),
    env: jsonb("env").$type<Record<string, string | null>>(),
    imageUrl: text("image_url"),
    deployment: jsonb("deployment").$type<{ url: string; sha: string }>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => messageThread.id),
    repoId: uuid("repo_id")
      .notNull()
      .references(() => repo.id),
    createdBy: text("created_by").notNull(),
    // previewImageUrl: text("preview_image_url"),
  },
  (table) => [
    index("repo_branch_thread_id_index").on(table.threadId),
    index("repo_branch_created_by_index").on(table.createdBy),
    index("repo_branch_repo_id_index").on(table.repoId),
  ]
);

export const branchesRelations = relations(repoBranch, ({ one, many }) => ({
  thread: one(messageThread, {
    fields: [repoBranch.threadId],
    references: [messageThread.id],
  }),
  repo: one(repo, { fields: [repoBranch.repoId], references: [repo.id] }),
}));

export const reposRelations = relations(repo, ({ many, one }) => ({
  branches: many(repoBranch),
}));
