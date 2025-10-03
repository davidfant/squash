import { streamText } from "@/lib/ai";
import { logger } from "@/lib/logger";
import { google } from "@ai-sdk/google";
import {
  convertToModelMessages,
  type UIMessageStreamOptions,
  type UIMessageStreamWriter,
} from "ai";
import type { ChatMessage } from "../types";
import { default as SystemInstructions } from "./prompt.md";

export async function streamDiscoverAgent(
  writer: UIMessageStreamWriter<ChatMessage>,
  messages: ChatMessage[],
  abortSignal: AbortSignal,
  messageMetadata: UIMessageStreamOptions<ChatMessage>["messageMetadata"]
) {
  logger.debug("Starting Discover stream");

  if (messages.filter((m) => m.role === "user").length > 1) {
    writer.write({ type: "data-AgentState", data: { type: "implement" } });
    return;
  }

  const stream = streamText({
    model: google("gemini-flash-latest"),
    messages: [
      { role: "system", content: SystemInstructions },
      ...convertToModelMessages(messages),
    ],
    abortSignal,
    onError: ({ error }) => logger.error("Error in discover agent", { error }),
    providerOptions: {
      google: { thinkingConfig: { thinkingBudget: 0 } },
    },
  });

  writer.merge(
    stream.toUIMessageStream({
      sendStart: false,
      sendFinish: false,
      messageMetadata,
    })
  );

  await stream.consumeStream();
}
