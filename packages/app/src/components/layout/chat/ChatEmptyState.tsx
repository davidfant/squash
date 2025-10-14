import { Suggestion } from "@/components/ai-elements/suggestion";
import { useScreenshotUpload } from "@/components/layout/chat/hooks/useScreenshotUpload";
import { useChatInputContext } from "@/components/layout/chat/input/context";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { RepoSuggestionColor } from "@squashai/api/agent/types";
import kebabCase from "lodash.kebabCase";

export interface ChatSuggestion {
  title: string;
  prompt: string;
  icon: string;
  color: RepoSuggestionColor;
}

const COLOR_CLASSES: Record<RepoSuggestionColor, string> = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  amber: "bg-amber-500",
  yellow: "bg-yellow-500",
  lime: "bg-lime-500",
  green: "bg-green-500",
  emerald: "bg-emerald-500",
  teal: "bg-teal-500",
  cyan: "bg-cyan-500",
  sky: "bg-sky-500",
  blue: "bg-blue-500",
  indigo: "bg-indigo-500",
  violet: "bg-violet-500",
  purple: "bg-purple-500",
  fuchsia: "bg-fuchsia-500",
  pink: "bg-pink-500",
  rose: "bg-rose-500",
  gray: "bg-gray-500",
};

// Icon component using CSS masking with CDN URLs
function LucideIcon({ name, className }: { name: string; className?: string }) {
  const iconUrl = `https://cdn.jsdelivr.net/npm/lucide-static@0.545.0/icons/${kebabCase(
    name
  )}.svg`;

  return (
    <div
      className={className}
      style={{
        maskImage: `url(${iconUrl})`,
        WebkitMaskImage: `url(${iconUrl})`,
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
        maskSize: "contain",
        WebkitMaskSize: "contain",
      }}
    />
  );
}

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
            return (
              <Suggestion
                key={index}
                suggestion={suggestion.prompt}
                onClick={input.setText}
              >
                <LucideIcon
                  name={suggestion.icon}
                  className={`size-4 ${COLOR_CLASSES[suggestion.color]}`}
                />
                {suggestion.title}
              </Suggestion>
            );
          })}

          <Tooltip>
            <TooltipTrigger asChild>
              <Suggestion
                suggestion="Upload a design screenshot"
                onClick={uploadScreenshot}
              >
                <LucideIcon
                  name="Image"
                  className="h-4 w-4 bg-muted-foreground"
                />
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
