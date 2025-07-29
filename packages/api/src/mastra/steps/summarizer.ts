import { google } from "@ai-sdk/google";
import { createStep } from "@mastra/core/workflows";
import { generateText } from "ai";
import { z } from "zod";

const model = google("gemini-2.5-flash");

export const summarizeConversation = createStep({
  id: "summarizeConversation",
  inputSchema: z.object({
    messages: z
      .object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
      .array(),
  }),
  outputSchema: z.object({ summary: z.string() }),
  execute: async ({ inputData }) => {
    const res = await generateText({
      model,
      prompt: `
Summarize this conversation for another agent in ≤10 bullets plus 3 action items. Be faithful and concise.

<conversation>
${inputData.messages.map((m) => `${m.role}: ${m.content}`).join("\n")}
</conversation>
      `.trim(),
    });
    return {
      summary: res.text,
      usage: { ...res.usage, modelId: res.response.modelId },
    };
  },
});
