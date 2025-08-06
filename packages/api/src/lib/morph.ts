import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

export async function morphMerge(opts: {
  instructions: string;
  original: string;
  update: string;
  apiKey: string;
}) {
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
          `<instruction>${opts.instructions}</instruction>`,
          `<code>${opts.original}</code>`,
          `<update>${opts.update}</update>`,
        ].join("\n"),
      },
    ],
  });
  return text;
}
