import { Suggestion } from "@/components/ai-elements/suggestion";
import { useScreenshotUpload } from "@/components/layout/chat/hooks/useScreenshotUpload";
import { useChatInputContext } from "@/components/layout/chat/input/context";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import * as Icons from "lucide-react";
import type { RepoSuggestionColor } from "@squashai/api/agent/types";
import type { ChatSuggestion } from "./types";

const COLOR_CLASSES: Record<RepoSuggestionColor, { button: string; icon: string; text: string }> = {
  red: {
    button: "border-red-500/40 bg-red-500/10 hover:bg-red-500/15",
    icon: "border-red-500/40 bg-red-500/15 text-red-500",
    text: "text-red-600",
  },
  orange: {
    button: "border-orange-500/40 bg-orange-500/10 hover:bg-orange-500/15",
    icon: "border-orange-500/40 bg-orange-500/15 text-orange-500",
    text: "text-orange-600",
  },
  amber: {
    button: "border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/15",
    icon: "border-amber-500/40 bg-amber-500/15 text-amber-500",
    text: "text-amber-600",
  },
  yellow: {
    button: "border-yellow-500/40 bg-yellow-500/10 hover:bg-yellow-500/15",
    icon: "border-yellow-500/40 bg-yellow-500/15 text-yellow-600",
    text: "text-yellow-700",
  },
  lime: {
    button: "border-lime-500/40 bg-lime-500/10 hover:bg-lime-500/15",
    icon: "border-lime-500/40 bg-lime-500/15 text-lime-500",
    text: "text-lime-600",
  },
  green: {
    button: "border-green-500/40 bg-green-500/10 hover:bg-green-500/15",
    icon: "border-green-500/40 bg-green-500/15 text-green-500",
    text: "text-green-600",
  },
  emerald: {
    button: "border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/15",
    icon: "border-emerald-500/40 bg-emerald-500/15 text-emerald-500",
    text: "text-emerald-600",
  },
  teal: {
    button: "border-teal-500/40 bg-teal-500/10 hover:bg-teal-500/15",
    icon: "border-teal-500/40 bg-teal-500/15 text-teal-500",
    text: "text-teal-600",
  },
  cyan: {
    button: "border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/15",
    icon: "border-cyan-500/40 bg-cyan-500/15 text-cyan-500",
    text: "text-cyan-600",
  },
  sky: {
    button: "border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/15",
    icon: "border-sky-500/40 bg-sky-500/15 text-sky-500",
    text: "text-sky-600",
  },
  blue: {
    button: "border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/15",
    icon: "border-blue-500/40 bg-blue-500/15 text-blue-500",
    text: "text-blue-600",
  },
  indigo: {
    button: "border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/15",
    icon: "border-indigo-500/40 bg-indigo-500/15 text-indigo-500",
    text: "text-indigo-600",
  },
  violet: {
    button: "border-violet-500/40 bg-violet-500/10 hover:bg-violet-500/15",
    icon: "border-violet-500/40 bg-violet-500/15 text-violet-500",
    text: "text-violet-600",
  },
  purple: {
    button: "border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/15",
    icon: "border-purple-500/40 bg-purple-500/15 text-purple-500",
    text: "text-purple-600",
  },
  fuchsia: {
    button: "border-fuchsia-500/40 bg-fuchsia-500/10 hover:bg-fuchsia-500/15",
    icon: "border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-500",
    text: "text-fuchsia-600",
  },
  pink: {
    button: "border-pink-500/40 bg-pink-500/10 hover:bg-pink-500/15",
    icon: "border-pink-500/40 bg-pink-500/15 text-pink-500",
    text: "text-pink-600",
  },
  rose: {
    button: "border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/15",
    icon: "border-rose-500/40 bg-rose-500/15 text-rose-500",
    text: "text-rose-600",
  },
  gray: {
    button: "border-gray-500/40 bg-gray-500/10 hover:bg-gray-500/15",
    icon: "border-gray-500/40 bg-gray-500/15 text-gray-500",
    text: "text-gray-600",
  },
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
          {items.map((suggestion) => {
            const Icon =
              Icons[suggestion.icon as keyof typeof Icons] ?? Icons.Sparkles;
            const colorClasses = suggestion.color
              ? COLOR_CLASSES[suggestion.color]
              : undefined;

            return (
              <Tooltip
                key={`${suggestion.title}-${suggestion.icon}`}
                delayDuration={150}
              >
                <TooltipTrigger asChild>
                  <Suggestion
                    suggestion={suggestion.prompt}
                    onClick={handleSuggestionSelect}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "flex h-auto items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors",
                      colorClasses?.button ?? "border-input bg-muted/30"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-6 items-center justify-center rounded-full border bg-background/90",
                        colorClasses?.icon
                      )}
                    >
                      <Icon className="size-3.5" />
                    </span>
                    <span
                      className={cn(
                        "font-medium leading-none",
                        colorClasses?.text
                      )}
                    >
                      {suggestion.title}
                    </span>
                  </Suggestion>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-xs text-xs leading-snug"
                >
                  {suggestion.prompt}
                </TooltipContent>
              </Tooltip>
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
