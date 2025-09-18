import {
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  ChatInput,
  type ChatInputValue,
} from "@/components/layout/chat/input/ChatInput";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useBranchContext } from "@/routes/branches/context";
import type { ChatMessage } from "@squashai/api/agent/types";
import type { FileUIPart } from "ai";
import { AlertCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import { v4 as uuid } from "uuid";
import { useChatContext } from "./context";
import { AssistantMessage } from "./message/AssistantMessage";
import { UserMessage } from "./message/UserMessage";
import { useMessageLineage } from "./messageLineage";
import { TodoList } from "./TodoList";

function ChatInputWithScrollToBottom({
  parentId,
  initialValue,
  ready,
}: {
  parentId: string;
  initialValue: ChatInputValue | undefined;
  ready: boolean;
}) {
  const { status, sendMessage } = useChatContext();
  const { scrollToBottom } = useStickToBottomContext();
  return (
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
          metadata: { createdAt: new Date().toISOString(), parentId },
        });
        scrollToBottom();
      }}
    />
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
  const { setPreview } = useBranchContext();
  const { messages: allMessages, status, sendMessage } = useChatContext();
  const messages = useMessageLineage(allMessages, id);
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
      .findLast((p) => p.type === "data-GitSha");
    if (lastSha) setPreview(lastSha.data.sha);
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

  return (
    <StickToBottom
      key={String(ready)}
      className="h-full w-full flex flex-col"
      initial="instant"
      resize="smooth"
    >
      <div className="flex-1 w-full overflow-hidden">
        <ConversationContent className="pt-0 pl-2 pb-2 pr-4">
          {messages.activePath.map((m) => {
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
                    loading={
                      m.id === mostRecentMessageId && status === "streaming"
                    }
                    className="mb-4"
                    onRetry={() => handleRetry(m.id)}
                  />
                );
            }
          })}
          {status === "submitted" && (
            <AssistantMessage
              message={{ id: "", role: "assistant", parts: [] }}
              loading
              className="mb-4"
            />
          )}

          {status === "error" && (
            <div className="overflow-hidden mb-2 text-destructive flex items-center gap-1">
              <AlertCircle className="w-4 h-4" /> Error
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </div>

      <div className="p-2 pt-0">
        {!!todos?.length && (
          // margin-inline: 12px;
          // margin-bottom: 0;
          // border-bottom-right-radius: 0;
          // border-bottom-left-radius: 0;
          // border-bottom: none;
          // background: unset;
          <Card className="mb-2 p-2">
            <TodoList todos={todos} />
          </Card>
        )}
        <ChatInputWithScrollToBottom
          parentId={messages.activePath[messages.activePath.length - 1]?.id!}
          initialValue={initialValue}
          ready={ready}
        />
      </div>
    </StickToBottom>
  );
}
