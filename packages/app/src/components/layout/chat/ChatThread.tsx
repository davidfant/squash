import { ChatInput } from "@/components/layout/chat/input/ChatInput";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { api, useMutation } from "@/hooks/api";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, type ReactNode } from "react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import { ChatThreadContent } from "./ChatThreadContent";
import { useChatContext } from "./context";
import { useMessageLineage } from "./messageLineage";
import { TodoList } from "./TodoList";

function ChatInputWithScrollToBottom({
  parentId,
  disabled,
  clearOnSubmit,
  onStop,
}: {
  parentId: string;
  disabled?: boolean;
  clearOnSubmit?: boolean;
  onStop: () => Promise<unknown>;
}) {
  const { status, sendMessage } = useChatContext();
  const { scrollToBottom } = useStickToBottomContext();
  return (
    <ChatInput
      disabled={disabled}
      autoFocus
      placeholder="Type a message..."
      submitting={status === "submitted" || status === "streaming"}
      clearOnSubmit={clearOnSubmit}
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
  );
}

export function ChatThread({
  id,
  loading,
  clearInputOnSubmit,
  empty,
}: {
  id: string;
  loading?: boolean;
  clearInputOnSubmit?: boolean;
  empty?: ReactNode;
}) {
  const { messages: allMessages, status } = useChatContext();
  const messages = useMessageLineage(allMessages, id);

  const stop = useMutation(api.branches[":branchId"].messages.abort.$post);

  const todos = useMemo(
    () =>
      messages.activePath
        .flatMap((p) => p.parts)
        .filter((p) => p.type === "tool-ClaudeCode__TodoWrite")
        .findLast((p) => p.state === "output-available")
        ?.input.todos.map((t) => ({
          id: t.content,
          content: t.status === "in_progress" ? t.activeForm : t.content,
          status: t.status,
        })),
    [messages.activePath]
  );

  console.log("ChatThread.activePath", status, messages.activePath);

  const content = (() => {
    if (loading) {
      return (
        <div className="flex-1 w-full grid place-items-center">
          <Spinner className="size-6 opacity-20" />
        </div>
      );
    }

    if (messages.activePath.length === 0) {
      return <div className="flex-1 w-full flex">{empty}</div>;
    }

    return <ChatThreadContent id={id} />;
  })();

  return (
    <StickToBottom
      key={`${loading}-${!!messages.activePath.length}`}
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
          clearOnSubmit={clearInputOnSubmit}
          onStop={() => stop.mutateAsync({ param: { branchId: id } })}
        />
      </div>
    </StickToBottom>
  );
}
