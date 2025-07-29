import { ChatInput } from "@/components/layout/chat/input/ChatInput";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { UserMessagePart } from "@hypershape/api/types";
import { AlertCircle } from "lucide-react";
import { useChat } from "./context";
import { AssistantMessage } from "./message/AssistantMessage";
import { MessageHeader } from "./message/MessageHeader";
import { UserMessage } from "./message/UserMessage";
import { ScrollToBottomButton } from "./ScrollToBottomButton";
import { useStickToBottom } from "./useStickToBottom";

export function ChatThread({
  initialValue,
  className,
}: {
  initialValue?: UserMessagePart[];
  className?: string;
}) {
  const { messages, status, sendMessage } = useChat();
  const sticky = useStickToBottom();

  return (
    <div className={cn("w-sm flex flex-col", className)}>
      <div className="flex-1 relative overflow-hidden">
        <div className="h-full overflow-y-auto pr-3 space-y-2" ref={sticky.ref}>
          {messages.map((m) => {
            switch (m.role) {
              case "user":
                return <UserMessage key={m.id} message={m} />;
              case "assistant":
                return <AssistantMessage key={m.id} message={m} />;
              default:
                return <div key={m.id}>{m.role}: todo...</div>;
            }
          })}
          {status === "submitted" && (
            <div>
              <MessageHeader author="LP" />
              <Skeleton className="h-4 w-48 mb-4" />
            </div>
          )}

          {status === "error" && (
            <div className="overflow-hidden mb-2 text-destructive flex items-center gap-1">
              <AlertCircle className="w-4 h-4" /> Error
            </div>
          )}
        </div>
        <ScrollToBottomButton
          visible={!sticky.atBottom}
          onClick={sticky.scrollToBottom}
        />
      </div>
      <div className="pr-3">
        <ChatInput
          initialValue={initialValue}
          autoFocus
          placeholder="Type a message..."
          submitting={status === "submitted" || status === "streaming"}
          maxRows={10}
          onSubmit={sendMessage}
        />
      </div>
    </div>
  );
}
