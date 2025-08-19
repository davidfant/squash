import {
  ChatInput,
  type ChatInputValue,
} from "@/components/layout/chat/input/ChatInput";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useBranchContext } from "@/routes/branches/context";
import type { ChatMessage } from "@squash/api/agent/types";
import type { FileUIPart } from "ai";
import { AlertCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useStickToBottom } from "use-stick-to-bottom";
import { v4 as uuid } from "uuid";
import { FilePreview } from "../file/FilePreview";
import { useChatContext } from "./context";
import { MessageActions } from "./message/MessageActions";
import { MessageHeader } from "./message/MessageHeader";
import { MessageParts } from "./message/MessageParts";
import { UserMessageFooter } from "./message/UserMessageFooter";
import { useMessageLineage } from "./messageLineage";
import { ScrollToBottomButton } from "./ScrollToBottomButton";
import { TodoList } from "./TodoList";

export function ChatThread({
  id,
  initialValue,
  ready,
}: {
  id: string;
  ready: boolean;
  initialValue?: ChatInputValue;
}) {
  const { setPreview, preview } = useBranchContext();
  const { messages: allMessages, status, sendMessage } = useChatContext();
  const messages = useMessageLineage(allMessages, id);
  const sticky = useStickToBottom({ resize: "smooth", initial: "instant" });
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  // Get the ID of the most recent message
  const mostRecentMessageId =
    messages.activePath[messages.activePath.length - 1]?.id;

  useEffect(() => {
    const last = messages.activePath[messages.activePath.length - 1];
    if (last?.role === "user" && !!last.parts.length) {
      sendMessage(undefined);
    }
  }, [!!messages.activePath.length]);

  const handleRetry = (assistantId: string, editedMessage?: ChatMessage) => {
    if (status === "submitted" || status === "streaming") return;
    const idx = messages.activePath.findIndex((m) => m.id === assistantId);
    if (idx === -1) return;
    const prevUser =
      editedMessage ||
      [...messages.activePath.slice(0, idx)]
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

  const handleEditSubmit = (messageId: string, value: ChatInputValue) => {
    const message = messages.activePath.find((m) => m.id === messageId);
    if (!message) return;

    // Create an edited version of the message
    const editedMessage: ChatMessage = {
      ...message,
      parts: [{ type: "text", text: value.text }, ...value.files],
    };

    // Find the next assistant message to trigger retry with the edited message
    const messageIndex = messages.activePath.findIndex(
      (m) => m.id === messageId
    );
    const nextAssistantMessage = messages.activePath
      .slice(messageIndex + 1)
      .find((m) => m.role === "assistant");

    if (nextAssistantMessage) {
      handleRetry(nextAssistantMessage.id, editedMessage);
    }

    // Clear editing state
    setEditingMessageId(null);
  };

  const handleVariantChange = (parentId: string, chosenChildId: string) => {
    const newActivePath = messages.switchVariant(parentId, chosenChildId);
    const lastSha = newActivePath
      .flatMap((m) => m.parts)
      .findLast((p) => p.type === "data-gitSha") as any;
    if (lastSha && lastSha.type === "data-gitSha") setPreview(lastSha.data.sha);
  };

  // Extract todos from the most recent todoWrite tool output
  const currentTodos = useMemo(() => {
    // Don't show todos when a new message has been submitted
    if (status === "submitted") {
      return [];
    }

    // Find the most recent todoWrite tool output by traversing messages in reverse
    for (let i = messages.activePath.length - 1; i >= 0; i--) {
      const message = messages.activePath[i];
      if (message && message.role === "assistant") {
        // Traverse parts in reverse order within each message to find the most recent
        for (let j = message.parts.length - 1; j >= 0; j--) {
          const part = message.parts[j];
          if (
            part &&
            part.type === "tool-todoWrite" &&
            "state" in part &&
            part.state === "output-available" &&
            "output" in part &&
            part.output?.todos
          ) {
            console.log(
              "Found todos in message",
              i,
              "part",
              j,
              ":",
              part.output.todos
            );
            return part.output.todos;
          }
        }
      }
    }
    console.log("No todos found in messages");
    return [];
  }, [messages.activePath, status]);

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={sticky.scrollRef}
          key={String(ready)}
          className="h-full overflow-y-auto overflow-x-hidden px-4 py-6 pb-10"
        >
          <div ref={sticky.contentRef} className="space-y-8">
            {messages.activePath.map((m) => {
              switch (m.role) {
                case "user":
                  const files = m.parts
                    .filter((p) => p.type === "file")
                    .map((p, i) => <FilePreview key={i} file={p} />);
                  const isEditing = editingMessageId === m.id;
                  const textContent = m.parts
                    .filter((p) => p.type === "text")
                    .map((p) => p.text)
                    .join("");

                  if (isEditing) {
                    return (
                      <div className="w-full" key={m.id}>
                        <ChatInput
                          initialValue={{
                            text: textContent,
                            files: m.parts.filter(
                              (p) => p.type === "file"
                            ) as FileUIPart[],
                          }}
                          submitting={false}
                          autoFocus
                          placeholder="Edit your message..."
                          disabled={false}
                          onSubmit={(value) => handleEditSubmit(m.id, value)}
                        />
                        <div className="flex gap-2 mt-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingMessageId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    );
                  }

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
                      <div className="flex items-center gap-2 mt-1">
                        <MessageActions
                          message={m}
                          currentPreviewSha={preview?.sha}
                          className={
                            m.id === mostRecentMessageId
                              ? ""
                              : "opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          }
                        />
                        <UserMessageFooter
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          variants={messages.variants.get(m.metadata!.parentId)}
                          onEdit={() => setEditingMessageId(m.id)}
                          onVariantChange={handleVariantChange}
                        />
                      </div>
                    </div>
                  );
                case "assistant":
                  return (
                    <div className="group space-y-3" key={m.id}>
                      <MessageHeader
                        author="Squash"
                        onRetry={() => handleRetry(m.id)}
                      />
                      <div className="pl-7 max-w-[90%] space-y-4">
                        <MessageParts parts={m.parts} />
                        {/* Only show MessageActions when not streaming */}
                        {(m.id !== mostRecentMessageId ||
                          (status !== "streaming" &&
                            status !== "submitted")) && (
                          <MessageActions
                            message={m}
                            currentPreviewSha={preview?.sha}
                            onRetry={() => handleRetry(m.id)}
                            className={cn(
                              "mt-4 transition-all duration-300 ease-in-out",
                              m.id === mostRecentMessageId
                                ? "animate-in fade-in-0 slide-in-from-bottom-2"
                                : "opacity-0 group-hover:opacity-100"
                            )}
                          />
                        )}
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

      <TodoList todos={currentTodos} />

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
