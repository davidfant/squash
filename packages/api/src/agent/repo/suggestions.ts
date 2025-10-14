import type { RepoSuggestion } from "@/database/schema";
import { repoSuggestionColors } from "@/database/schema";
import { logger } from "@/lib/logger";
import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "@/lib/ai";
import z from "zod";

const ICON_OPTIONS = [
  "Sparkles",
  "LayoutDashboard",
  "FileText",
  "Palette",
  "ListTodo",
  "Code2",
  "Image",
  "Boxes",
] as const;

const suggestionSchema = z.object({
  title: z.string().min(1).max(64),
  prompt: z.string().min(1).max(500),
  icon: z.enum(ICON_OPTIONS),
  color: z.enum(repoSuggestionColors),
});

const responseSchema = z.object({
  suggestions: z.array(suggestionSchema).min(2).max(4),
});

export const FALLBACK_SUGGESTIONS: RepoSuggestion[] = [
  {
    title: "Polish hero copy",
    prompt:
      "Review the hero section headline and supporting copy. Suggest clearer, action-oriented messaging that matches the product shown in the screenshot.",
    icon: "Sparkles",
    color: "violet",
  },
  {
    title: "Tighten layout spacing",
    prompt:
      "Look over the layout in the screenshot and recommend spacing, alignment, or hierarchy tweaks that would make the screen feel more balanced and readable.",
    icon: "LayoutDashboard",
    color: "blue",
  },
  {
    title: "Outline user flow",
    prompt:
      "Based on the UI in the screenshot, describe the likely user journey and list the next components or screens we should build to complete that flow.",
    icon: "ListTodo",
    color: "emerald",
  },
];

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  return error;
}

export async function generateRepoSuggestionsFromScreenshot(
  screenshotUrl: string | null
): Promise<RepoSuggestion[]> {
  if (!screenshotUrl) {
    return FALLBACK_SUGGESTIONS;
  }

  try {
    const { object } = await generateObject({
      model: anthropic("claude-3-5-sonnet-latest"),
      schema: responseSchema,
      messages: [
        {
          role: "system",
          content:
            "You help product teams prototype faster. Given a design screenshot you propose focused starting prompts for an AI pair programmer. Keep titles short (max 4 words). Prompts should be actionable instructions 1-2 sentences long. Use distinct icons and badge colors for each suggestion.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `The screenshot below shows the current state of a playground. Return between 2 and 4 tailored suggestions that would help someone continue iterating on this design. Use only these icon names: ${ICON_OPTIONS.join(", ")}. Choose a unique icon per suggestion. Pick from these badge colors: ${repoSuggestionColors.join(", ")}.`,
            },
            { type: "image", image: screenshotUrl },
          ],
        },
      ],
    });

    const suggestions = responseSchema.parse(object).suggestions;
    if (!suggestions.length) {
      return FALLBACK_SUGGESTIONS;
    }
    return suggestions;
  } catch (error) {
    logger.warn("Failed to generate repo suggestions", {
      error: serializeError(error),
    });
    return FALLBACK_SUGGESTIONS;
  }
}
