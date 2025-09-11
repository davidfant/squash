import { filesystemCacheMiddleware } from "@/lib/ai/filesystemCacheMiddleware";
import { generateText } from "@/lib/ai/sdk";
import { createOpenAI } from "@ai-sdk/openai";
import { wrapLanguageModel } from "ai";

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
    model: wrapLanguageModel({
      model: morph("auto"),
      middleware: filesystemCacheMiddleware(),
    }),
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
