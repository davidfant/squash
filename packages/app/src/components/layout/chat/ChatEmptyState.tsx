import { Suggestion } from "@/components/ai-elements/suggestion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FileText, Image } from "lucide-react";

interface ChatEmptyStateProps {
  onSuggestionClick: (suggestion: string) => void;
}

export function ChatEmptyState({ onSuggestionClick }: ChatEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-8">
      <div className="text-center space-y-6">
        <p className="text-muted-foreground text-sm">
          You can start chatting with Squash to tell it what you want.
        </p>

        <TooltipProvider>
          <div className="flex justify-center">
            <div className="flex gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Suggestion
                    suggestion="Start from PRD"
                    onClick={onSuggestionClick}
                  >
                    <FileText className="h-4 w-4 text-amber-500" />
                    Start from PRD
                  </Suggestion>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Paste your PRD in the chat and Squash will help you build it
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Suggestion
                    suggestion="Start from screenshot"
                    onClick={onSuggestionClick}
                  >
                    <Image className="h-4 w-4 text-green-500" />
                    Start from screenshot
                  </Suggestion>
                </TooltipTrigger>
                <TooltipContent>
                  Paste a screenshot of your design in the chat and Squash will
                  help you build it
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </TooltipProvider>
      </div>
    </div>
  );
}
