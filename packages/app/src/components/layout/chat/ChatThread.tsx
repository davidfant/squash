import {
  ChatInput,
  type ChatInputValue,
} from "@/components/layout/chat/input/ChatInput";
import { Skeleton } from "@/components/ui/skeleton";
import { usePrevious } from "@/hooks/usePrevious";
import { useChat } from "@ai-sdk/react";
import type { ChatMessage } from "@hypershape-ai/api/agent/types";
import { DefaultChatTransport } from "ai";
import { AlertCircle } from "lucide-react";
import { useEffect } from "react";
import { useStickToBottom } from "use-stick-to-bottom";
import { v4 as uuid } from "uuid";
import { FilePreview } from "../file/FilePreview";
import { MessageHeader } from "./message/MessageHeader";
import { MessageParts } from "./message/MessageParts";
import { ScrollToBottomButton } from "./ScrollToBottomButton";

export function ChatThread({
  endpoint,
  initialValue,
  initialMessages,
}: {
  endpoint: string;
  initialValue?: ChatInputValue;
  initialMessages?: ChatMessage[];
}) {
  const { messages, status, sendMessage, setMessages, resumeStream } =
    useChat<ChatMessage>({
      messages: initialMessages,
      transport: new DefaultChatTransport({
        api: endpoint,
        credentials: "include",
        prepareSendMessagesRequest: ({ messages }) => ({
          body: { message: messages[messages.length - 1] },
        }),
      }),
      generateId: uuid,
    });

  const hasInitialMessages = !!initialMessages;
  const hadInitialMessages = usePrevious(hasInitialMessages);
  useEffect(() => {
    if (!hadInitialMessages && hasInitialMessages) {
      setMessages(initialMessages);
    }
  }, [!!initialMessages]);
  const sticky = useStickToBottom({ resize: "smooth", initial: "instant" });

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.role === "user" && !!last.parts.length) {
      sendMessage(undefined);
    }
  }, [!!messages.length]);

  return (
    <div className="w-sm flex flex-col">
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={sticky.scrollRef}
          key={String(!!initialMessages)}
          className="h-full overflow-y-auto overflow-x-hidden space-y-2 p-2 pb-8"
        >
          <div ref={sticky.contentRef}>
            {messages.map((m) => {
              switch (m.role) {
                case "user":
                  const files = m.parts
                    .filter((p) => p.type === "file")
                    .map((p, i) => <FilePreview key={i} file={p} />);
                  return (
                    <div className="flex flex-col items-end" key={m.id}>
                      {!!files.length && (
                        <div className="flex flex-wrap gap-2 justify-end mt-1">
                          {files}
                        </div>
                      )}
                      <div className="w-max max-w-[75%] rounded-xl px-3 py-2 bg-muted">
                        <MessageParts parts={m.parts} />
                      </div>
                    </div>
                  );
                case "assistant":
                  return (
                    <div key={m.id}>
                      <MessageHeader author="Hive Mind" />
                      <MessageParts parts={m.parts} />
                    </div>
                  );
                // default:
                //   return <div key={m.id}>{m.role}: todo...</div>;
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
        </div>
        <ScrollToBottomButton
          visible={!sticky.isAtBottom}
          onClick={sticky.scrollToBottom}
        />
      </div>

      <div className="p-2 pt-0">
        <ChatInput
          disabled={!initialMessages}
          initialValue={initialValue}
          autoFocus
          placeholder="Type a message..."
          submitting={status === "submitted" || status === "streaming"}
          maxRows={10}
          onSubmit={(value) => {
            sendMessage(value);
            sticky.scrollToBottom();
          }}
        />
      </div>
    </div>
  );
}
