import { cn } from "@/lib/utils";
import type { ChatMessage } from "@squashai/api/agent/types";
import { ChatErrorAlert } from "../ChatErrorAlert";
import { AssistantMessageActions } from "./AssistantMessageActions";
import { MessageHeader } from "./MessageHeader";
import { MessageParts } from "./parts/MessageParts";

export const AssistantMessage = ({
  message,
  className,
  isLast,
  streaming,
  onRetry,
}: {
  message: ChatMessage;
  className?: string;
  isLast?: boolean;
  streaming?: boolean;
  onRetry?: () => void;
}) => (
  <div className={cn("group space-y-1", className)}>
    <MessageHeader author="Squash" />
    <div className="ml-7">
      <MessageParts
        id={message.id}
        parts={message.parts}
        streaming={streaming}
      />
      {isLast && <ChatErrorAlert />}
      {!streaming && (
        <AssistantMessageActions className="-ml-3" onRetry={onRetry} />
      )}
    </div>
  </div>
);
