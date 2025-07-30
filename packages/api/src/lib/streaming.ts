import type { Database } from "@/database";
import * as schema from "@/database/schema";
import type { AnyMessage } from "@/types";
import type { CoreAssistantMessage, CoreToolMessage, TextStreamPart } from "ai";
import { type Context } from "hono";
import { streamSSE } from "hono/streaming";

export type AsyncIterableWithResponse<T, R> = AsyncIterable<T> & {
  response: Promise<R>;
};

export async function stream(data: {
  context: Context;
  db: Database;
  threadId: string;
  stream: AsyncIterableWithResponse<
    TextStreamPart<any>,
    {
      messages: Array<
        (CoreAssistantMessage | CoreToolMessage) & { id: string }
      >;
    }
  >;
}) {
  return streamSSE(data.context, async (stream) => {
    const usagePerMessage: Record<
      string,
      {
        modelId: string;
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
      }
    > = {};
    try {
      for await (const delta of data.stream) {
        switch (delta.type) {
          case "error":
            await stream.writeSSE({
              event: "error",
              data: (delta.error as Error).message,
              id: data.context.get("requestId"),
            });
            break;
          // TODO: remove model metadata/prompts...
          // case "step-start":
          // case "finish":
          //   break;
          case "step-finish":
            usagePerMessage[delta.messageId] = {
              modelId: delta.response.modelId,
              ...delta.usage,
            };
          default:
            await stream.writeSSE({ data: JSON.stringify(delta) });
            break;
        }
      }

      const response = await data.stream.response;
      await data.db.insert(schema.messages).values(
        response.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content as AnyMessage["content"],
          threadId: data.threadId,
          status: "done" as const,
          usage: usagePerMessage[m.id],
        }))
      );
    } catch (error) {
      console.error(error);
    }

    // await stream.writeSSE({ event: "done", data: "" });
  });
}
