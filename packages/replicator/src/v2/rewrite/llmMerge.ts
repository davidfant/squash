import { generateText } from "@/lib/ai";
import { createOpenAI } from "@ai-sdk/openai";

export async function llmMerge(opts: {
  instructions: string;
  original: string;
  update: string;
  apiKey: string;
  sessionId?: string;
}) {
  const morph = createOpenAI({
    baseURL: "https://api.morphllm.com/v1",
    apiKey: opts.apiKey,
    name: "Morph LLM merge",
  }).chat;

  const { text } = await generateText({
    model: morph("auto"),
    messages: [
      {
        role: "user",
        content: [
          `<instruction>${opts.instructions}</instruction>`,
          `<code>${opts.original}</code>`,
          `<update>${opts.update}</update>`,
        ].join("\n"),
      },
    ],
  });
  return text;
}
