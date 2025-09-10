import type {
  LanguageModelV2,
  LanguageModelV2StreamPart,
} from "@ai-sdk/provider";
import type { SDKMessage } from "@anthropic-ai/claude-code";
import { messageToStreamPart } from "./message-to-stream-part";

export class ClaudeCodeLanguageModel implements LanguageModelV2 {
  readonly specificationVersion = "v2" as const;
  readonly modelId = "claude-code";
  readonly provider = "anthropic";
  readonly supportedUrls = { "image/*": [/^https?:\/\/.*$/] };

  constructor(private generate: () => Promise<SDKMessage[]>) {}

  async doGenerate(
    _options: Parameters<LanguageModelV2["doGenerate"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV2["doGenerate"]>>> {
    throw new Error("Not implemented");
  }

  async doStream(
    options: Parameters<LanguageModelV2["doStream"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV2["doStream"]>>> {
    const generate = this.generate;
    const stream = new ReadableStream<LanguageModelV2StreamPart>({
      async start(controller) {
        const messages = await generate();
        const process = messageToStreamPart(controller);
        messages.forEach(process);
        controller.close();

        // controller.enqueue({ type: 'stream-start', warnings });

        // for (const text of messages) {
        //   const id = String(blockIdx++);

        //   controller.enqueue({ type: 'text-start', id });
        //   controller.enqueue({ type: 'text-delta', id, delta: text });
        //   controller.enqueue({ type: 'text-end', id });
        // }

        // controller.enqueue({
        //   type: 'finish',
        //   finishReason: 'stop',
        //   usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        // });
        // controller.close();
      },
    });

    return { stream };
  }
}
