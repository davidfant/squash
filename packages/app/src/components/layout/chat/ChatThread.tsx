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
import { UserMessageFooter } from "./message/UserMessageFooter";
import { useMessageLineage } from "./messageLineage";
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
  const {
    messages: allMessages,
    status,
    sendMessage,
    setMessages,
  } = useChat<ChatMessage>({
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: endpoint,
      credentials: "include",
      prepareSendMessagesRequest: ({ messages }) => {
        const l = messages[messages.length - 1]!;
        const parentId = l.metadata!.parentId;
        const message = { id: l.id, parts: l.parts, parentId };
        return { body: { message } };
      },
    }),
    generateId: uuid,
  });
  const messages = useMessageLineage(allMessages);

  const hasInitialMessages = !!initialMessages;
  const hadInitialMessages = usePrevious(hasInitialMessages);
  useEffect(() => {
    if (!hadInitialMessages && hasInitialMessages) {
      setMessages(initialMessages);
    }
  }, [!!initialMessages]);
  const sticky = useStickToBottom({ resize: "smooth", initial: "instant" });

  useEffect(() => {
    const last = messages.activePath[messages.activePath.length - 1];
    if (last?.role === "user" && !!last.parts.length) {
      sendMessage(undefined);
    }
  }, [!!messages.activePath.length]);

  const handleRetry = (assistantId: string) => {
    if (status === "submitted" || status === "streaming") return;
    const idx = messages.activePath.findIndex((m) => m.id === assistantId);
    if (idx === -1) return;
    const prevUser = [...messages.activePath.slice(0, idx)]
      .reverse()
      .find((m) => m.role === "user");
    if (!prevUser) return;

    const parentId = prevUser.metadata!.parentId;
    const resent: ChatMessage = {
      ...prevUser,
      id: uuid(),
      metadata: { parentId, createdAt: new Date().toISOString() },
    };

    const newMessages = [...allMessages, resent];
    setMessages(newMessages);
    messages.switchVariant(parentId, resent.id, newMessages);
  };

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={sticky.scrollRef}
          key={String(!!initialMessages)}
          className="h-full overflow-y-auto overflow-x-hidden space-y-2 px-4 py-2 pb-8"
        >
          <div ref={sticky.contentRef}>
            {messages.activePath.map((m) => {
              switch (m.role) {
                case "user":
                  const files = m.parts
                    .filter((p) => p.type === "file")
                    .map((p, i) => <FilePreview key={i} file={p} />);
                  return (
                    <div className="group flex flex-col items-end" key={m.id}>
                      {!!files.length && (
                        <div className="flex flex-wrap gap-2 justify-end mt-1">
                          {files}
                        </div>
                      )}
                      <div className="w-max max-w-[75%] rounded-xl px-4 py-3 bg-muted">
                        <MessageParts parts={m.parts} />
                      </div>
                      <UserMessageFooter
                        className="opacity-0 group-hover:opacity-100"
                        variants={messages.variants.get(m.metadata!.parentId)}
                        onEdit={() => {
                          // TODO: Implement edit functionality
                          console.log("Edit message:", m.id);
                        }}
                        onVariantChange={messages.switchVariant}
                      />
                    </div>
                  );
                case "assistant":
                  return (
                    <div className="group space-y-1" key={m.id}>
                      <MessageHeader
                        author="hivemind"
                        onRetry={() => handleRetry(m.id)}
                      />
                      <div className="pl-7">
                        <MessageParts parts={m.parts} />
                      </div>
                    </div>
                  );
                // default:
                //   return <div key={m.id}>{m.role}: todo...</div>;
              }
            })}
            {status === "submitted" && (
              <div className="space-y-1">
                <MessageHeader author="hivemind" />
                <Skeleton className="h-4 w-48 mb-4 ml-7" />
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

      <div className="px-4 py-2 pt-0">
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
