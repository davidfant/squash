import { Suggestion } from "@/components/ai-elements/suggestion";
import { useScreenshotUpload } from "@/components/layout/chat/hooks/useScreenshotUpload";
import { useChatInputContext } from "@/components/layout/chat/input/context";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { RepoSuggestionColor } from "@squashai/api/agent/types";
import * as Icons from "lucide-react";
import type { ChatSuggestion } from "./types";

const COLOR_CLASSES: Record<RepoSuggestionColor, string> = {
  red: "text-red-500",
  orange: "text-orange-500",
  amber: "text-amber-500",
  yellow: "text-yellow-500",
  lime: "text-lime-500",
  green: "text-green-500",
  emerald: "text-emerald-500",
  teal: "text-teal-500",
  cyan: "text-cyan-500",
  sky: "text-sky-500",
  blue: "text-blue-500",
  indigo: "text-indigo-500",
  violet: "text-violet-500",
  purple: "text-purple-500",
  fuchsia: "text-fuchsia-500",
  pink: "text-pink-500",
  rose: "text-rose-500",
  gray: "text-gray-500",
};

const FALLBACK_SUGGESTIONS: ChatSuggestion[] = [
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

export function ChatEmptyState({
  suggestions,
}: {
  suggestions?: ChatSuggestion[];
}) {
  const uploadScreenshot = useScreenshotUpload();
  const input = useChatInputContext();
  const items = suggestions?.length ? suggestions : FALLBACK_SUGGESTIONS;

  const handleSuggestionSelect = (prompt: string) => {
    input.setState(undefined);
    input.setText(prompt);
  };

  return (
    <div className="w-full flex flex-col justify-end p-8">
      <div className="text-center space-y-6">
        <p className="text-muted-foreground text-sm">
          Prototype your next feature by chatting with Squash
        </p>

        <div className="flex gap-3 justify-center flex-wrap">
          {items.map((suggestion, index) => {
            const Icon =
              (Icons[
                suggestion.icon as keyof typeof Icons
              ] as Icons.LucideIcon) ?? Icons.Sparkles;

            return (
              <Suggestion
                key={index}
                suggestion={suggestion.prompt}
                onClick={input.setText}
              >
                <Icon
                  className={cn("size-4", COLOR_CLASSES[suggestion.color])}
                />
                {suggestion.title}
              </Suggestion>
            );
          })}

          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <Suggestion
                suggestion="Upload a design screenshot"
                onClick={uploadScreenshot}
                variant="ghost"
                size="sm"
                className="flex h-auto items-center gap-2 rounded-full border border-dashed px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <Icons.Image className="h-4 w-4" />
                Upload screenshot
              </Suggestion>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              Paste a screenshot of your design in the chat and Squash will help
              you build it
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
