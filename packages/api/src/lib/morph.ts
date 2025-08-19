import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { traceable } from "langsmith/traceable";

export async function morphMerge(opts: {
  instructions: string;
  original: string;
  update: string;
  apiKey: string;
  sessionId?: string;
}) {
  const run = traceable(
    async (input: {
      instructions: string;
      original: string;
      update: string;
    }) => {
      const morph = createOpenAI({
        baseURL: "https://api.morphllm.com/v1",
        apiKey: opts.apiKey,
      }).chat;

      const { text } = await generateText({
        model: morph("auto"),
        messages: [
          {
            role: "user",
            content: [
              `<instruction>${input.instructions}</instruction>`,
              `<code>${input.original}</code>`,
              `<update>${input.update}</update>`,
            ].join("\n"),
          },
        ],
        experimental_telemetry: { isEnabled: true },
      });
      return text;
    },
    {
      name: "Morph Code Merge",
      run_type: "chain",
      metadata: opts.sessionId ? { session_id: opts.sessionId } : undefined,
    }
  );

  return run({
    instructions: opts.instructions,
    original: opts.original,
    update: opts.update,
  });
}
