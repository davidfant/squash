import { generateText } from "@/lib/ai";
import { google } from "@ai-sdk/google";
import SystemInstructions from "./prompt.md";

export async function generateName(prompt: string) {
  const { text } = await generateText({
    model: google("gemini-flash-latest"),
    messages: [
      { role: "system", content: SystemInstructions },
      { role: "user", content: prompt },
    ],
    providerOptions: {
      google: { thinkingConfig: { thinkingBudget: 0 } },
    },
  });
  return text.trim();
}
