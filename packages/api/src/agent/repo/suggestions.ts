import type { RepoSuggestion } from "@/database/schema";
import { repoSuggestionColors } from "@/database/schema";
import { generateObject } from "@/lib/ai";
import { google } from "@ai-sdk/google";
import z from "zod";

export async function generateRepoSuggestionsFromScreenshot(
  screenshotUrl: string
): Promise<RepoSuggestion[]> {
  const { object } = await generateObject({
    model: google("gemini-flash-latest"),
    schema: z.object({
      suggestions: z
        .object({
          title: z.string().min(1).max(64),
          prompt: z.string().min(1).max(500),
          icon: z.string(),
          color: z.enum(repoSuggestionColors),
        })
        .array()
        .min(2)
        .max(4),
    }),
    messages: [
      {
        role: "system",
        content: `You help product teams prototype faster. Given a design screenshot you propose focused starting prompts for an AI pair programmer. Keep titles short (max 4 words). Prompts should be actionable instructions 1-2 sentences long. Use distinct icons and badge colors for each suggestion. The colors should be one of the following: ${repoSuggestionColors.join(
          ", "
        )}. The icon should be a valid Lucide icon name.`,
      },
      {
        role: "user",
        content: [{ type: "image", image: screenshotUrl }],
      },
    ],
  });
  return object.suggestions;
}
