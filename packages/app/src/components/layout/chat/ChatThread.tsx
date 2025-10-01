import {
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  ChatInput,
  type ChatInputValue,
} from "@/components/layout/chat/input/ChatInput";
import { ChatInputFileUploadsProvider } from "@/components/layout/chat/input/ChatInputFileUploadsContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api, useMutation } from "@/hooks/api";
import { useBranchContext } from "@/routes/branches/context";
import type { ChatMessage } from "@squashai/api/agent/types";
import type { FileUIPart } from "ai";
import { useMemo, useState } from "react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import { v4 as uuid } from "uuid";
import { ChatErrorAlert } from "./ChatErrorAlert";
import { useChatContext } from "./context";
import { AssistantMessage } from "./message/AssistantMessage";
import { UserMessage } from "./message/UserMessage";
import { useMessageLineage } from "./messageLineage";
import { TodoList } from "./TodoList";

function ChatInputWithScrollToBottom({
  parentId,
  initialValue,
  ready,
  onStop,
}: {
  parentId: string;
  initialValue: ChatInputValue | undefined;
  ready: boolean;
  onStop: () => Promise<unknown>;
}) {
  const { status, sendMessage, error } = useChatContext();
  const { scrollToBottom } = useStickToBottomContext();
  return (
    <ChatInputFileUploadsProvider initialValue={initialValue?.files}>
      <ChatInput
        disabled={!ready}
        initialValue={initialValue}
        autoFocus
        placeholder="Type a message..."
        submitting={status === "submitted" || status === "streaming"}
        maxRows={10}
        onStop={onStop}
        onSubmit={(value) => {
          sendMessage({
            ...value,
            metadata: { createdAt: new Date().toISOString(), parentId },
          });
          scrollToBottom();
        }}
      />
    </ChatInputFileUploadsProvider>
  );
}

export function ChatThread({
  id,
  initialValue,
  ready,
}: {
  id: string;
  ready: boolean;
  initialValue?: ChatInputValue;
}) {
  const { restoreVersion } = useBranchContext();
  const {
    messages: allMessages,
    status,
    sendMessage,
    error,
  } = useChatContext();
  const messages = useMessageLineage(allMessages, id);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  const lastMessageId = messages.activePath.slice(-1)[0]?.id;

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

  const handleEditSubmit = (messageId: string, value: ChatInputValue) => {
    const currMessage = messages.activePath.find((m) => m.id === messageId);
    if (!currMessage) return;

    const editedMessage: ChatMessage = {
      role: "user",
      id: uuid(),
      parts: [...value.files, { type: "text", text: value.text }],
      metadata: {
        parentId: currMessage.metadata!.parentId,
        createdAt: new Date().toISOString(),
      },
    };

    sendMessage(editedMessage);
    messages.switchVariant(currMessage.metadata!.parentId, editedMessage.id, [
      ...allMessages,
      editedMessage,
    ]);
    setEditingMessageId(null);
  };

  const stop = useMutation(api.branches[":branchId"].messages.abort.$post);

  const handleVariantChange = (parentId: string, chosenChildId: string) => {
    const newActivePath = messages.switchVariant(parentId, chosenChildId);
    restoreVersion(newActivePath[newActivePath.length - 1]!.id);
  };

  const todos = useMemo(
    () =>
      messages.activePath
        .flatMap((p) => p.parts)
        .filter((p) => p.type === "tool-ClaudeCodeTodoWrite")
        .findLast((p) => p.state === "output-available")
        ?.input.todos.map((t, index) => ({
          id: index.toString(),
          content: t.status === "in_progress" ? t.activeForm : t.content,
          status: t.status,
        })),
    [messages.activePath]
  );

  console.log("ChatThread.activePath", status, messages.activePath);
  const lastMessage = messages.activePath[messages.activePath.length - 1];
  const showLoading =
    status === "submitted" ||
    (status === "streaming" && lastMessage?.role === "user");
  return (
    <StickToBottom
      key={String(ready)}
      className="h-full w-full flex flex-col"
      initial="instant"
      resize="smooth"
    >
      <div className="flex-1 w-full overflow-hidden relative">
        <ConversationContent className="pt-0 pl-2 pb-2 pr-4">
          {messages.activePath.map((m, idx) => {
            switch (m.role) {
              case "user":
                const isEditing = editingMessageId === m.id;
                const textContent = m.parts
                  .filter((p) => p.type === "text")
                  .map((p) => p.text)
                  .join("");

                if (isEditing) {
                  return (
                    <div className="w-full" key={m.id}>
                      <ChatInputFileUploadsProvider
                        initialValue={m.parts.filter((p) => p.type === "file")}
                      >
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
                      </ChatInputFileUploadsProvider>
                    </div>
                  );
                }

                return (
                  <UserMessage
                    key={m.id}
                    message={m}
                    variants={messages.variants.get(m.metadata!.parentId)}
                    onEdit={() => setEditingMessageId(m.id)}
                    onVariantChange={handleVariantChange}
                  />
                );
              case "assistant":
                return (
                  <AssistantMessage
                    key={m.id}
                    message={m}
                    streaming={status === "streaming" && m.id === lastMessageId}
                    isLast={m.id === lastMessageId}
                    className="mb-4"
                    onRetry={() => handleRetry(m.id)}
                  />
                );
            }
          })}
          {showLoading && (
            <AssistantMessage
              message={{ id: "", role: "assistant", parts: [] }}
              isLast
              streaming
              className="mb-4"
            />
          )}

          {lastMessage?.role !== "assistant" && status === "error" && (
            <div className="ml-7">
              <ChatErrorAlert />
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </div>

      <div className="p-2 pt-0">
        {!!todos && !todos.every((t) => t.status === "completed") && (
          // margin-inline: 12px;
          // margin-bottom: 0;
          // border-bottom-right-radius: 0;
          // border-bottom-left-radius: 0;
          // border-bottom: none;
          // background: unset;
          <Card className="mb-2 p-2 shadow-none">
            <TodoList todos={todos} />
          </Card>
        )}
        <ChatInputWithScrollToBottom
          parentId={messages.activePath[messages.activePath.length - 1]?.id!}
          initialValue={initialValue}
          ready={ready}
          onStop={() => stop.mutateAsync({ param: { branchId: id } })}
        />
      </div>
    </StickToBottom>
  );
}
