import { Action, Actions } from "@/components/ai-elements/actions";
import { RefreshCw, ThumbsDown, ThumbsUp } from "lucide-react";

export function AssistantMessageActions({
  className,
  onRetry,
}: {
  className?: string;
  onRetry?: () => void;
}) {
  return (
    <Actions className={className}>
      {onRetry && (
        <Action tooltip="Retry message" onClick={onRetry}>
          <RefreshCw />
        </Action>
      )}
      <Action>
        <ThumbsUp />
      </Action>
      <Action>
        <ThumbsDown />
      </Action>
    </Actions>
  );
}
