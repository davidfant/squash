"use client";

import { Action, Actions } from "@/components/ai-elements/actions";
import { toast } from "@/components/ui/sonner";
import { RefreshCw, ThumbsDown, ThumbsUp } from "lucide-react";
import { usePostHog } from "posthog-js/react";

export function AssistantMessageActions({
  className,
  onRetry,
  messageId,
}: {
  className?: string;
  onRetry?: () => void;
  messageId: string;
}) {
  const posthog = usePostHog();
  const handleThumbsDown = () => {
    posthog?.capture("assistant_message_thumbs_down", { messageId });
    toast.success("Your feedback has been sent to the team.");
  };

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
      <Action onClick={handleThumbsDown}>
        <ThumbsDown />
      </Action>
    </Actions>
  );
}
