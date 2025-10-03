import { streamText } from "@/lib/ai";
import { logger } from "@/lib/logger";
import { toReasoningSummarizingTextStreamResult } from "@/lib/to-reasoning-summarizing-text-stream-result";
import { anthropic } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  type UIMessageStreamOptions,
  type UIMessageStreamWriter,
} from "ai";
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
      messages: [
        { role: "system", content: SystemInstructions },
        ...convertToModelMessages(messages),
      ],
      abortSignal,
    })
  );

  writer.merge(
    stream.toUIMessageStream({
      sendStart: false,
      sendFinish: false,
      messageMetadata,
    })
  );

  await stream.consumeStream();

  writer.write({ type: "data-AgentState", data: { type: "implement" } });
}
