import type { ProjectMetadata } from "dev-server-utils/metadata";
import { relations } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organization, user } from "./auth";

export const projects = pgTable("projects", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  // description: text(),
  metadata: jsonb().$type<ProjectMetadata>().notNull(),
  // inputSchema: jsonb("input_schema").notNull(),
  // outputSchema: jsonb("output_schema").notNull(),
  daytonaSandboxId: text("daytona_sandbox_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
  // threadId: uuid("thread_id")
  //   .notNull()
  //   .references(() => messageThreads.id),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => user.id),
  // previewImageUrl: text("preview_image_url"),
});
// (table) => [index("workflow_thread_id_index").on(table.threadId)]

export const projectsRelations = relations(projects, ({ one }) => ({
  // thread: one(messageThreads, {
  //   fields: [workflows.threadId],
  //   references: [messageThreads.id],
  // }),
  organization: one(organization, {
    fields: [projects.organizationId],
    references: [organization.id],
  }),
}));
