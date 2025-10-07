import { Suggestion } from "@/components/ai-elements/suggestion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useScreenshotUpload } from "@/routes/landing/hooks/useScreenshotUpload";
import { FileText, Image } from "lucide-react";

export function ChatEmptyState() {
  const uploadScreenshot = useScreenshotUpload();
  return (
    <div className="w-full flex flex-col justify-end p-8">
      <div className="text-center space-y-6">
        <p className="text-muted-foreground text-sm">
          Prototype your next feature by chatting with Squash
        </p>

        <div className="flex gap-3 justify-center flex-wrap">
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Suggestion suggestion="Start from PRD">
                  <FileText className="h-4 w-4 text-amber-500" />
                  Start from PRD
                </Suggestion>
                <p className="text-xs text-muted-foreground mt-1">
                  (Coming soon)
                </p>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Paste your PRD in the chat and Squash will help you build it
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Suggestion
                suggestion="Start from screenshot"
                onClick={uploadScreenshot}
              >
                <Image className="h-4 w-4 text-green-500" />
                Start from screenshot
              </Suggestion>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Paste a screenshot of your design in the chat and Squash will help
              you build it
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
