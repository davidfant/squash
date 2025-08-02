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
import { repoBranch } from "./repos";

export const messageRole = pgEnum("message_role", [
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

export const messageThread = pgTable("message_thread", {
  id: uuid().primaryKey().defaultRandom(),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const message = pgTable(
  "message",
  {
    id: uuid().primaryKey().defaultRandom(),
    role: messageRole().notNull(),
    content: jsonb()
      .$type<Array<UserMessagePart | AssistantMessagePart | ToolMessagePart>>()
      .notNull(),
    status: messageStatus().default("pending").notNull(),
    usage: jsonb().$type<{
      modelId: string;
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
      .references(() => messageThread.id),
    // parentId: uuid("parent_id").references((): AnyPgColumn => messages.id),
  },
  (table) => [
    // index("message_parent_id_index").on(table.parentId),
    index("message_thread_id_index").on(table.threadId),
  ]
);

export const messageThreadsRelations = relations(
  messageThread,
  ({ many, one }) => ({ messages: many(message), repoBranch: one(repoBranch) })
);

export const messagesRelations = relations(message, ({ one }) => ({
  thread: one(messageThread, {
    fields: [message.threadId],
    references: [messageThread.id],
  }),
}));
