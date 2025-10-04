import { streamClaudeCodeAgent } from "@/agent/claude-code/stream";
import type { ChatMessage } from "@/agent/types";
import { createDatabase } from "@/database";
import * as schema from "@/database/schema";
import { logger } from "@/lib/logger";
import { raceWithAbortSignal } from "@/lib/raceWithAbortSignal";
import type { Sandbox } from "@/sandbox/types";
import {
  createUIMessageStream,
  type UIMessageStreamOnFinishCallback,
  type UIMessageStreamOptions,
} from "ai";
import { env } from "cloudflare:workers";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { streamDiscoverAgent } from "./discover/stream";
import { storeInitialCommitInSystemMessage } from "./util";

export function streamAgent(params: {
  messages: ChatMessage[];
  threadId: string;
  branchId: string;
  restoreVersion: boolean;
  controller: AbortController;
  sandbox: Sandbox.Manager.Base;
  readSessionData(id: string): Promise<string>;
}) {
  const db = createDatabase(env);
  const nextParentId = params.messages.slice(-1)[0]!.id;

  const state = params.messages
    .flatMap((m) => m.parts)
    .findLast((p) => p.type === "data-AgentState")?.data;

  logger.info("Streaming agent", {
    state,
    messages: params.messages.length,
    threadId: params.threadId,
    branchId: params.branchId,
    nextParentId,
  });

  const messageMetadata: UIMessageStreamOptions<ChatMessage>["messageMetadata"] =
    (opts) => {
      if (opts.part.type === "start") {
        const createdAt = new Date().toISOString();
        return { createdAt, parentId: nextParentId };
      }
      // if (opts.part.type === "finish-step") {
      //   usage.push({
      //     ...opts.part.usage,
      //     modelId: opts.part.response.modelId,
      //   });
      // }
      return undefined;
    };

  const onFinish: UIMessageStreamOnFinishCallback<ChatMessage> = async ({
    responseMessage,
  }) => {
    logger.debug("Finished streaming response message", {
      state,
      threadId: params.threadId,
      responseMessageId: responseMessage.id,
      parts: responseMessage.parts.length,
      // usageCount: usage.length,
    });
    await db.insert(schema.message).values({
      id: responseMessage.id,
      role: responseMessage.role as "user" | "assistant",
      parts: responseMessage.parts,
      // usage,
      threadId: params.threadId,
      parentId: nextParentId,
    });
  };
  return createUIMessageStream<ChatMessage>({
    originalMessages: params.messages, // just needed for id generation
    generateId: randomUUID,
    onFinish,
    execute: async ({ writer }) => {
      writer.write({
        type: "start",
        messageMetadata: messageMetadata({ part: { type: "start" } }),
      });
      let stateChange = true;

      const writerUpdatingStateChange: typeof writer = {
        write: (part) => {
          if (part.type === "data-AgentState") stateChange = true;
          return writer.write(part);
        },
        merge: (stream) => writer.merge(stream),
        onError: (error) => writer.onError?.(error),
      };

      while (stateChange) {
        stateChange = false;

        switch (state?.type) {
          case "implement":
            if (params.restoreVersion) {
              await raceWithAbortSignal(
                params.sandbox.restoreVersion(params.messages),
                params.controller.signal
              );
            }

            const agentSession = params.messages
              .flatMap((m) => m.parts)
              .findLast((p) => p.type === "data-AgentSession");

            await raceWithAbortSignal(
              params.sandbox.waitUntilStarted(),
              params.controller.signal
            );
            await raceWithAbortSignal(
              storeInitialCommitInSystemMessage(
                params.messages,
                params.sandbox,
                db
              ),
              params.controller.signal
            );
            await streamClaudeCodeAgent({
              writer: writerUpdatingStateChange,
              messages: params.messages,
              sandbox: params.sandbox,
              threadId: params.threadId,
              sessionId: agentSession?.data.id,
              previewUrl: await params.sandbox.getPreviewUrl(),
              abortSignal: params.controller.signal,
              messageMetadata,
              readSessionData: params.readSessionData,
              onScreenshot: (imageUrl) =>
                db
                  .update(schema.repoBranch)
                  .set({ imageUrl, updatedAt: new Date() })
                  .where(eq(schema.repoBranch.id, params.branchId)),
            });
            break;
          case "discover":
          default:
            await streamDiscoverAgent(
              writerUpdatingStateChange,
              params.messages,
              params.controller.signal,
              messageMetadata
            );
            break;
        }

        writer.write({ type: "finish" });
      }
    },
  });
}
