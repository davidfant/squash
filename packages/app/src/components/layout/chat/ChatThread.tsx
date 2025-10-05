import { ChatInput } from "@/components/layout/chat/input/ChatInput";
import {
  type ChatInputValue,
  ChatInputProvider,
} from "@/components/layout/chat/input/context";
import { Card } from "@/components/ui/card";
import { api, useMutation } from "@/hooks/api";
import type { ChatMessage } from "@squashai/api/agent/types";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import { v4 as uuid } from "uuid";
import { ChatEmptyState } from "./ChatEmptyState";
import { ChatThreadContent } from "./ChatThreadContent";
import { useChatContext } from "./context";
import { useMessageLineage } from "./messageLineage";
import { TodoList } from "./TodoList";

function ChatInputWithScrollToBottom({
  parentId,
  disabled,
  onStop,
}: {
  parentId: string;
  disabled: boolean;
  onStop: () => Promise<unknown>;
}) {
  const { status, sendMessage } = useChatContext();
  const { scrollToBottom } = useStickToBottomContext();
  return (
    <ChatInputProvider>
      <ChatInput
        disabled={disabled}
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
    </ChatInputProvider>
  );
}

export function ChatThread({
  id,
  initialValue,
  loading,
}: {
  id: string;
  loading: boolean;
  initialValue?: ChatInputValue;
}) {
  const {
    messages: allMessages,
    status,
    sendMessage,
    error,
  } = useChatContext();
  const messages = useMessageLineage(allMessages, id);

  const stop = useMutation(api.branches[":branchId"].messages.abort.$post);

  const todos = useMemo(
    () =>
      messages.activePath
        .flatMap((p) => p.parts)
        .filter((p) => p.type === "tool-ClaudeCodeTodoWrite")
        .findLast((p) => p.state === "output-available")
        ?.input.todos.map((t) => ({
          id: t.content,
          content: t.status === "in_progress" ? t.activeForm : t.content,
          status: t.status,
        })),
    [messages.activePath]
  );

  console.log("ChatThread.activePath", status, messages.activePath);
  const lastMessage = messages.activePath[messages.activePath.length - 1];

  const handleSuggestionClick = (suggestion: string) => {
    const suggestionMessage: ChatMessage = {
      id: uuid(),
      role: "user",
      parts: [{ type: "text", text: suggestion }],
      metadata: {
        parentId: id,
        createdAt: new Date().toISOString(),
      },
    };
    sendMessage(suggestionMessage);
  };
  const content = (() => {
    if (loading) {
      return (
        <div className="h-full w-full grid place-items-center">
          <Loader2 className="size-6 animate-spin opacity-20" />
        </div>
      );
    }

    if (messages.activePath.length === 0 || true) {
      return (
        <div className="h-full w-full flex">
          <ChatEmptyState onSuggestionClick={handleSuggestionClick} />
        </div>
      );
    }

    return <ChatThreadContent id={id} />;
  })();

  return (
    <StickToBottom
      key={String(loading)}
      className="h-full w-full flex flex-col"
      initial="instant"
      resize="smooth"
    >
      {content}

      <div className="p-2 pt-0">
        <AnimatePresence>
          {!!todos && !todos.every((t) => t.status === "completed") && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <Card className="mb-2 p-2 shadow-none">
                <TodoList todos={todos} />
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
        <ChatInputWithScrollToBottom
          parentId={messages.activePath[messages.activePath.length - 1]?.id!}
          disabled={loading}
          onStop={() => stop.mutateAsync({ param: { branchId: id } })}
        />
      </div>
    </StickToBottom>
  );
}
