import type {
  AssistantMessagePart,
  ToolMessagePart,
  UserMessagePart,
} from "@/types";
import { relations, type InferEnum } from "drizzle-orm";
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const messageRoles = pgEnum("message_roles", [
  "user",
  "assistant",
  "tool",
  // "data",
]);

export const messageStatus = pgEnum("message_status", [
  "pending",
  "loading",
  "done",
  "error",
]);

export type MessageStatus = InferEnum<typeof messageStatus>;

export const messageThreads = pgTable("message_threads", {
  id: uuid().primaryKey().defaultRandom(),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messages = pgTable(
  "messages",
  {
    id: uuid().primaryKey().defaultRandom(),
    role: messageRoles().notNull(),
    content: jsonb()
      .$type<Array<UserMessagePart | AssistantMessagePart | ToolMessagePart>>()
      .notNull(),
    status: messageStatus().default("pending").notNull(),
    usage: jsonb().$type<{
      model: string;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    }>(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => messageThreads.id),
    // parentId: uuid("parent_id").references((): AnyPgColumn => messages.id),
  },
  (table) => [
    // index("message_parent_id_index").on(table.parentId),
    index("message_thread_id_index").on(table.threadId),
  ]
);

export const messageThreadsRelations = relations(
  messageThreads,
  ({ many, one }) => ({ messages: many(messages), project: one(projects) })
);

export const messagesRelations = relations(messages, ({ one }) => ({
  thread: one(messageThreads, {
    fields: [messages.threadId],
    references: [messageThreads.id],
  }),
}));
