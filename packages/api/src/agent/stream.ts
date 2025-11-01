import { streamClaudeCodeAgent } from "@/agent/claude-code/stream";
import type { ChatMessage } from "@/agent/types";
import { createDatabase } from "@/database";
import * as schema from "@/database/schema";
import { logger } from "@/lib/logger";
import { raceWithAbortSignal } from "@/lib/raceWithAbortSignal";
import type { Sandbox } from "@/sandbox/types";
import { createUIMessageStream, type UIMessageStreamOptions } from "ai";
import { env } from "cloudflare:workers";
import { randomUUID } from "crypto";
import { storeInitialCommitInSystemMessage } from "./util";

const getState = (messages: ChatMessage[]) =>
  messages.flatMap((m) => m.parts).findLast((p) => p.type === "data-AgentState")
    ?.data;

function streamInner(params: {
  messages: ChatMessage[];
  threadId: string;
  branchId: string;
  sandbox: Sandbox.Manager.Base;
  controller: AbortController;
  restoreVersion: boolean;
  messageMetadata: UIMessageStreamOptions<ChatMessage>["messageMetadata"];
  readSessionData(id: string): Promise<string>;
  onFinish(message: ChatMessage): void;
}) {
  const db = createDatabase(env);
  const state = getState(params.messages) ?? { type: "implement" };
  logger.debug("Running agent from state", state);

  return createUIMessageStream<ChatMessage>({
    // originalMessages: params.messages, // needed for generateId to be called
    generateId: randomUUID,
    onFinish: ({ responseMessage }) => params.onFinish(responseMessage),
    execute: async ({ writer }) => {
      switch (state?.type) {
        case "implement":
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

          if (params.restoreVersion) {
            logger.info("Restoring version before streaming Claude Code agent");
            await raceWithAbortSignal(
              params.sandbox.restoreVersion(params.messages),
              params.controller.signal
            );
          }

          const agentSession = params.messages
            .flatMap((m) => m.parts)
            .findLast((p) => p.type === "data-AgentSession");

          await streamClaudeCodeAgent({
            writer,
            messages: params.messages,
            sandbox: params.sandbox,
            threadId: params.threadId,
            branchId: params.branchId,
            sessionId: agentSession?.data.id,
            previewUrl: await params.sandbox.getPreviewUrl(),
            abortSignal: params.controller.signal,
            messageMetadata: params.messageMetadata,
            readSessionData: params.readSessionData,
            // onScreenshot: (imageUrl) =>
            //   db
            //     .update(schema.repoBranch)
            //     .set({ imageUrl, updatedAt: new Date() })
            //     .where(eq(schema.repoBranch.id, params.branchId)),
          });
          break;
        // case "discover":
        // default:
        //   await streamDiscoverAgent(
        //     writer,
        //     params.messages,
        //     params.controller.signal,
        //     params.messageMetadata
        //   );
        //   break;
      }
    },
  });
}

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

  logger.info("Streaming agent", {
    messages: params.messages.length,
    threadId: params.threadId,
    branchId: params.branchId,
    repoId: params.repoId,
    restoreVersion: params.restoreVersion,
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

  const messages = [...params.messages];
  return createUIMessageStream<ChatMessage>({
    originalMessages: params.messages, // needed for generateId to be called
    generateId: randomUUID,
    onFinish: async ({ responseMessage }) => {
      logger.debug("Finished streaming response message", {
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
    },
    execute: async ({ writer }) => {
      writer.write({
        type: "start",
        messageMetadata: messageMetadata({ part: { type: "start" } }),
      });

      while (!params.controller.signal.aborted) {
        const newMessage = await new Promise<ChatMessage>(async (resolve) => {
          const innerStream = streamInner({
            ...params,
            messages,
            messageMetadata,
            onFinish: resolve,
          });

          writer.merge(innerStream);
        });

        if (!getState([newMessage])) break;
        messages.push(newMessage);
      }

      writer.write({ type: "finish" });
    },
  });
}
