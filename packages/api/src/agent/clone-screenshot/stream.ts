import { streamText } from "@/lib/ai";
import { logger } from "@/lib/logger";
import { toReasoningSummarizingTextStreamResult } from "@/lib/to-reasoning-summarizing-text-stream-result";
import { anthropic } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  type InferUIMessageChunk,
  type UIMessageStreamOptions,
  type UIMessageStreamWriter,
} from "ai";
import { randomUUID } from "crypto";
import type { ChatMessage } from "../types";
import SystemInstructions from "./prompt.md";

export async function streamCloneScreenshotPlanAgent(
  writer: UIMessageStreamWriter<ChatMessage>,
  messages: ChatMessage[],
  abortSignal: AbortSignal,
  messageMetadata: UIMessageStreamOptions<ChatMessage>["messageMetadata"]
) {
  logger.debug("Starting Clone Screenshot stream");

  const stream = toReasoningSummarizingTextStreamResult(
    streamText({
      model: anthropic("claude-sonnet-4-5-20250929"),
      // model: google("gemini-flash-latest"),
      messages: [
        { role: "system", content: SystemInstructions },
        ...convertToModelMessages(messages),
      ],
      abortSignal,
    })
  );

  writer.merge(
    stream
      .toUIMessageStream({
        sendStart: false,
        sendFinish: false,
        messageMetadata,
      })
      .pipeThrough(
        new TransformStream<
          InferUIMessageChunk<ChatMessage>,
          InferUIMessageChunk<ChatMessage>
        >({
          async transform(chunk, c) {
            switch (chunk.type) {
              case "text-start":
              case "text-end":
                break;
              case "text-delta":
                const toolCallId = randomUUID();
                c.enqueue({
                  type: "tool-input-available",
                  toolCallId,
                  toolName: "AnalyzeScreenshot",
                  input: undefined,
                });
                c.enqueue({
                  type: "tool-output-available",
                  toolCallId,
                  output: chunk.delta,
                });
                break;
              default:
                c.enqueue(chunk);
                break;
            }
          },
        })
      )
  );

  await stream.consumeStream();

  writer.write({ type: "data-AgentState", data: { type: "implement" } });
}
