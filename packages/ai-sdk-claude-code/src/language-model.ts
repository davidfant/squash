import type {
  LanguageModelV2,
  LanguageModelV2StreamPart,
} from "@ai-sdk/provider";
import * as ClaudeCode from "@anthropic-ai/claude-agent-sdk";
import type { ModelMessage } from "ai";
import { randomUUID } from "crypto";
import { messageToStreamPart } from "./message-to-stream-part";

const defaultQuery = ({
  prompt,
  options,
}: {
  prompt: ModelMessage;
  options?: ClaudeCode.Options;
}) =>
  ClaudeCode.query({
    prompt: (async function* () {
      const content: Array<
        | { type: "text"; text: string }
        | { type: "image"; source: { type: "url"; url: string } }
      > = [];
      if (typeof prompt.content === "string") {
        content.push({ type: "text", text: prompt.content });
      } else {
        content.push(
          ...prompt.content
            .map((c) => {
              if (c.type === "text") {
                return { type: "text" as const, text: c.text };
              }
              if (c.type === "file" && c.mediaType.startsWith("image/")) {
                return {
                  type: "image" as const,
                  source: { type: "url" as const, url: c.data.toString() },
                };
              }
            })
            .filter((c) => !!c)
        );
      }

      yield {
        type: "user",
        session_id: randomUUID(),
        parent_tool_use_id: null,
        message: { role: "user", content },
      };
    })(),
    options,
  });

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
      prompt: ModelMessage;
      options?: ClaudeCode.Options;
    }) => AsyncGenerator<ClaudeCode.SDKMessage, void> = defaultQuery
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
          const lastUserMessage = options.prompt.findLast(
            (m) => m.role === "user"
          );
          if (!lastUserMessage) {
            throw new Error("No last user message content");
          }

          const q = this.query({
            prompt: lastUserMessage,
            options: {
              cwd: this.cwd,
              executable: "node",
              includePartialMessages: true,
              permissionMode: "bypassPermissions",
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
