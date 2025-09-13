import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useBranchContext } from "@/routes/branches/context";
import type { ChatMessage } from "@squash/api/agent/types";
import {
  AlertCircle,
  ArrowRight,
  Copy,
  MoreHorizontal,
  RotateCcw,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useState } from "react";

interface MessageActionsProps {
  message: ChatMessage;
  currentPreviewSha?: string;
  onRetry?: () => void;
  className?: string;
}

export function MessageActions({
  message,
  currentPreviewSha,
  onRetry,
  className,
}: MessageActionsProps) {
  const { setPreview } = useBranchContext();
  const [thumbsUp, setThumbsUp] = useState(false);
  const [thumbsDown, setThumbsDown] = useState(false);

  const latestCommitSha = message.parts.findLast(
    (p) => p.type === "data-GitSha"
  )?.data.sha;

  // Check if this message's commit is the one being previewed
  const isCurrentlyPreviewed = latestCommitSha === currentPreviewSha;

  const handleThumbsUp = () => {
    setThumbsUp(!thumbsUp);
    if (thumbsDown) setThumbsDown(false);
  };

  const handleThumbsDown = () => {
    setThumbsDown(!thumbsDown);
    if (thumbsUp) setThumbsUp(false);
  };

  const handleCopyMessageId = () => {
    navigator.clipboard.writeText(message.id);
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* See Preview button - only if there's a git commit */}
      {latestCommitSha && (
        <Button
          size="sm"
          variant="outline"
          className={cn(
            "h-7 text-xs px-2 transition-all duration-200 ease-in-out",
            isCurrentlyPreviewed &&
              "bg-green-50/50 border-green-200/50 text-green-600 hover:bg-green-50"
          )}
          onClick={() => setPreview(latestCommitSha)}
        >
          {isCurrentlyPreviewed ? "Previewing" : "See Preview"}
          <ArrowRight
            className={cn(
              "h-3 w-3 ml-1 transition-all duration-200",
              isCurrentlyPreviewed && "text-green-500"
            )}
          />
        </Button>
      )}

      {/* Only show thumbs up/down and more options for assistant messages */}
      {message.role === "assistant" && (
        <>
          {/* Thumbs up */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 transition-all duration-200 hover:scale-110"
            onClick={handleThumbsUp}
          >
            <ThumbsUp
              className={cn(
                "h-3.5 w-3.5 transition-all duration-200",
                thumbsUp && "fill-current"
              )}
            />
          </Button>

          {/* Thumbs down */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 transition-all duration-200 hover:scale-110"
            onClick={handleThumbsDown}
          >
            <ThumbsDown
              className={cn(
                "h-3.5 w-3.5 transition-all duration-200",
                thumbsDown && "fill-current"
              )}
            />
          </Button>

          {/* Retry - only for assistant messages */}
          {onRetry && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 transition-all duration-200 hover:scale-110"
              onClick={onRetry}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* More options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 transition-all duration-200 hover:scale-110"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCopyMessageId}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Message ID
              </DropdownMenuItem>
              <DropdownMenuItem>
                <AlertCircle className="h-4 w-4 mr-2" />
                Report Issue
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </div>
  );
}
