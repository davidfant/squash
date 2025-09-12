import type { ChatMessage } from "@squash/api/agent/types";
import { AssistantMessageActions } from "./AssistantMessageActions";
import { MessageHeader } from "./MessageHeader";
import { MessageParts } from "./MessageParts";

export function AssistantMessage({
  message,
  loading,
  onRetry,
}: {
  message: ChatMessage;
  loading: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="group space-y-3">
      <MessageHeader author="Squash" />
      <div className="ml-7">
        <MessageParts parts={message.parts} />
        {/* Only show MessageActions when not streaming */}
        {!loading && (
          <AssistantMessageActions className="-ml-3" onRetry={onRetry} />
        )}
      </div>
    </div>
  );
}
