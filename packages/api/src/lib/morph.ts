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

  console.log("####");
  console.log(
    [
      `<instruction>${opts.instructions}</instruction>`,
      `<code>${opts.original}</code>`,
      `<update>${opts.update}</update>`,
    ].join("\n")
  );
  console.log("####");

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
  console.log(text);
  console.log("####");
  return text;
}
