import {
  ChatInput,
  type ChatInputValue,
} from "@/components/layout/chat/input/ChatInput";
import { Skeleton } from "@/components/ui/skeleton";
import { useBranchContext } from "@/routes/branches/context";
import type { ChatMessage } from "@squash/api/agent/types";
import { AlertCircle } from "lucide-react";
import { useEffect } from "react";
import { useStickToBottom } from "use-stick-to-bottom";
import { v4 as uuid } from "uuid";
import { FilePreview } from "../file/FilePreview";
import { useChatContext } from "./context";
import { MessageHeader } from "./message/MessageHeader";
import { MessageParts } from "./message/MessageParts";
import { UserMessageFooter } from "./message/UserMessageFooter";
import { useMessageLineage } from "./messageLineage";
import { ScrollToBottomButton } from "./ScrollToBottomButton";

export function ChatThread({
  id,
  initialValue,
  ready,
}: {
  id: string;
  ready: boolean;
  initialValue?: ChatInputValue;
}) {
  const { setPreview } = useBranchContext();
  const { messages: allMessages, status, sendMessage } = useChatContext();
  const messages = useMessageLineage(allMessages, id);
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

    sendMessage(resent);
    messages.switchVariant(parentId, resent.id, [...allMessages, resent]);
  };

  const handleVariantChange = (parentId: string, chosenChildId: string) => {
    const newActivePath = messages.switchVariant(parentId, chosenChildId);
    const lastSha = newActivePath
      .flatMap((m) => m.parts)
      .findLast((p) => p.type === "data-gitSha");
    if (lastSha) setPreview(lastSha.data.sha);
  };

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={sticky.scrollRef}
          key={String(ready)}
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
                        onVariantChange={handleVariantChange}
                      />
                    </div>
                  );
                case "assistant":
                  return (
                    <div className="group space-y-1" key={m.id}>
                      <MessageHeader
                        author="Squash"
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
                <MessageHeader author="Squash" />
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
          disabled={!ready}
          initialValue={initialValue}
          autoFocus
          placeholder="Type a message..."
          submitting={status === "submitted" || status === "streaming"}
          maxRows={10}
          onSubmit={(value) => {
            sendMessage({
              ...value,
              metadata: {
                createdAt: new Date().toISOString(),
                parentId:
                  messages.activePath[messages.activePath.length - 1]!.id,
              },
            });
            sticky.scrollToBottom();
          }}
        />
      </div>
    </div>
  );
}
