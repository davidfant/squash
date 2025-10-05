import {
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { ChatInput } from "@/components/layout/chat/input/ChatInput";
import {
  type ChatInputValue,
  ChatInputProvider,
} from "@/components/layout/chat/input/context";
import { Button } from "@/components/ui/button";
import { useBranchContext } from "@/routes/branches/context";
import type { ChatMessage } from "@squashai/api/agent/types";
import { useState } from "react";
import { v4 as uuid } from "uuid";
import { ChatErrorAlert } from "./ChatErrorAlert";
import { useChatContext } from "./context";
import { AssistantMessage } from "./message/AssistantMessage";
import { UserMessage } from "./message/UserMessage";
import { useMessageLineage } from "./messageLineage";

export function ChatThreadContent({ id }: { id: string }) {
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

  const handleVariantChange = (parentId: string, chosenChildId: string) => {
    const newActivePath = messages.switchVariant(parentId, chosenChildId);
    restoreVersion(newActivePath[newActivePath.length - 1]!.id);
  };

  return (
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
                    <ChatInputProvider
                      initialValue={{
                        text: textContent,
                        files: m.parts.filter((p) => p.type === "file"),
                        state: m.parts.find((p) => p.type === "data-AgentState")
                          ?.data,
                      }}
                    >
                      <ChatInput
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
                    </ChatInputProvider>
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
  );
}
