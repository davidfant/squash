import type { ChatMessage } from "@/agent/types";
import { relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { repoBranch } from "./repos";

export const messageRole = pgEnum("message_role", [
  "system",
  "user",
  "assistant",
]);

export const messageThread = pgTable("message_thread", {
  id: uuid().primaryKey().defaultRandom(),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export interface MessageUsage {
  modelId: string;
  inputTokens: number | undefined;
  outputTokens: number | undefined;
  totalTokens: number | undefined;
  reasoningTokens?: number | undefined;
  cachedInputTokens?: number | undefined;
}

export const message = pgTable(
  "message",
  {
    id: uuid().primaryKey().defaultRandom(),
    role: messageRole().notNull(),
    parts: jsonb().$type<ChatMessage["parts"]>().notNull(),
    usage: jsonb().$type<MessageUsage[]>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => messageThread.id),
    parentId: uuid("parent_id").references((): AnyPgColumn => message.id),
  },
  (table) => [
    index("message_parent_id_index").on(table.parentId),
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

export type Message = typeof message.$inferSelect;
