import { useMounted } from "@/hooks/useMounted";
import { convertStreamPartsToMessages } from "@/lib/convertStreamPartsToMessages";
import { sseStream } from "@/lib/sseStream";
import type { AnyMessage, UserMessagePart } from "@hypershape-ai/api/types";
import type { TextStreamPart, ToolResultPart } from "ai";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { v4 as uuid } from "uuid";

type ChatStatus = "ready" | "submitted" | "streaming" | "error";

interface ChatContextValue {
  isLoading: boolean;
  status: ChatStatus;
  messages: Array<AnyMessage & { streaming?: boolean }>;
  toolResults: Record<string, ToolResultPart>;
  sendMessage(content: UserMessagePart[], endpoint?: string): Promise<void>;
  setMessages(messages: AnyMessage[]): void;
}

const ChatContext = createContext<ChatContextValue>(null as any);

function useMessages(initial: AnyMessage[] | undefined) {
  const [messages, setMessages] = useState<AnyMessage[]>(initial ?? []);

  useEffect(() => {
    if (initial) setMessages(initial);
  }, [!!initial]);

  return [messages, setMessages] as const;
}

export function ChatProvider({
  endpoint,
  initialMessages,
  children,
  autoSubmit,
  ready = true,
  onToolResult,
}: // onSendMessage,
{
  endpoint: string;
  initialMessages: AnyMessage[] | undefined;
  previewBaseUrl?: string;
  children: ReactNode;
  ready?: boolean;
  autoSubmit?: UserMessagePart[];
  onToolResult?(toolResult: ToolResultPart): void;
  // onSendMessage?(
  //   content: UserMessagePart[],
  //   messages: AnyMessage[]
  // ): Promise<boolean>;
}) {
  const isLoading = !initialMessages;
  const [messages, setMessages] = useMessages(initialMessages);
  const [streamingMessage, setChatMessage] = useState<AnyMessage>();
  const [status, setStatus] = useState<ChatStatus>("ready");

  const sendMessage = async (
    content?: UserMessagePart[],
    customEndpoint: string = endpoint
  ) => {
    setStatus("submitted");
    const message = !!content ? { id: uuid(), content } : undefined;
    if (message) {
      setMessages((prev) => [
        ...prev,
        { ...message, role: "user", createdAt: new Date().toISOString() },
      ]);
    }

    // if (onSendMessage && !!message) {
    //   const shouldSend = await onSendMessage(message.parts ?? [], messages);
    //   if (!shouldSend) {
    //     setStatus("ready");
    //     return;
    //   }
    // }

    try {
      const streamParts: TextStreamPart<any>[] = [];
      let prevMessagesLength = 0;
      await sseStream({
        message,
        endpoint: customEndpoint,
        onEvent: (streamPart) => {
          streamParts.push(streamPart);
          const messages = convertStreamPartsToMessages(streamParts);
          if (messages.some((m) => !!m.content.length)) setStatus("streaming");

          if (streamPart.type === "tool-result") {
            onToolResult?.(streamPart);
          }

          if (messages.length > prevMessagesLength) {
            const newMessages = messages.slice(
              prevMessagesLength - 1,
              messages.length - 1
            );
            setMessages((prev) => [...prev, ...newMessages]);
            prevMessagesLength = messages.length;
          }

          setChatMessage(messages[messages.length - 1]);
        },
      });

      const messages = convertStreamPartsToMessages(streamParts);
      setChatMessage(undefined);
      setMessages((prev) => [
        ...prev,
        ...messages.slice(prevMessagesLength - 1),
      ]);
      setStatus("ready");
    } catch (error) {
      console.error(error);
      setStatus("error");
    }
  };

  const mounted = useMounted();
  useEffect(() => {
    if (mounted && ready) {
      sendMessage(autoSubmit);
    }
  }, [mounted, ready]);

  return (
    <ChatContext.Provider
      value={{
        status,
        isLoading,
        messages: !!streamingMessage
          ? [...messages, { ...streamingMessage, streaming: true }]
          : messages,
        toolResults: messages
          .filter((m) => m.role === "tool")
          .flatMap((m) => m.content)
          .reduce(
            (acc, p) => ({ ...acc, [p.toolCallId]: p }),
            {} as Record<string, ToolResultPart>
          ),
        sendMessage,
        setMessages,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => useContext(ChatContext);
