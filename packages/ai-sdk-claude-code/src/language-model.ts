import type {
  LanguageModelV2,
  LanguageModelV2StreamPart,
} from "@ai-sdk/provider";
import {
  query as claudeCodeQuery,
  type Options,
  type SDKMessage,
} from "@anthropic-ai/claude-code";
import { messageToStreamPart } from "./message-to-stream-part";

export class ClaudeCodeLanguageModel implements LanguageModelV2 {
  readonly specificationVersion = "v2" as const;
  readonly modelId = "claude-code";
  readonly provider = "anthropic";
  readonly supportedUrls = { "image/*": [/^https?:\/\/.*$/] };

  constructor(
    private cwd: string,
    // private query: typeof claudeCodeQuery = claudeCodeQuery
    private query: ({
      prompt,
      options,
    }: {
      prompt: string;
      options?: Options;
    }) => AsyncGenerator<SDKMessage, void> = claudeCodeQuery
  ) {}

  async doGenerate(
    _options: Parameters<LanguageModelV2["doGenerate"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV2["doGenerate"]>>> {
    throw new Error("Not implemented");
  }

  async doStream(
    options: Parameters<LanguageModelV2["doStream"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV2["doStream"]>>> {
    const stream = new ReadableStream<LanguageModelV2StreamPart>({
      start: async (controller) => {
        try {
          const process = messageToStreamPart(controller);
          const lastMessageContent = options.prompt
            .findLast((m) => m.role === "user")
            ?.content.find((c) => c.type === "text")?.text;
          if (!lastMessageContent) {
            throw new Error("No last message content");
          }

          const q = this.query({
            prompt: lastMessageContent,
            options: {
              cwd: this.cwd,
              executable: "node",
              includePartialMessages: true,
              permissionMode: "acceptEdits",
              // TODO: add session id
              resume: undefined,
            },
          });
          for await (const msg of q) process(msg);
        } catch (error) {
          console.error("Error in ClaudeCodeLanguageModel.doStream", error);
        } finally {
          controller.close();
        }
      },
    });

    return { stream };
  }
}
