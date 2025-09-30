import { cn } from "@/lib/utils";
import type { ChatMessage } from "@squashai/api/agent/types";
import { ChatErrorAlert } from "../ChatErrorAlert";
import { AssistantMessageActions } from "./AssistantMessageActions";
import { MessageHeader } from "./MessageHeader";
import { MessageParts } from "./parts/MessageParts";

export const AssistantMessage = ({
  message,
  loading,
  className,
  isLast,
  onRetry,
}: {
  message: ChatMessage;
  loading: boolean;
  className?: string;
  isLast?: boolean;
  onRetry?: () => void;
}) => (
  <div className={cn("group space-y-3", className)}>
    <MessageHeader author="Squash" />
    <div className="ml-7">
      <MessageParts parts={message.parts} />
      {isLast && <ChatErrorAlert />}
      {!loading && (
        <AssistantMessageActions className="-ml-3" onRetry={onRetry} />
      )}
    </div>
  </div>
);
