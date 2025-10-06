import { usePrevious } from "@/hooks/usePrevious";
import {
  useChat,
  type UseChatHelpers,
  type UseChatOptions,
} from "@ai-sdk/react";
import type { ChatMessage } from "@squashai/api/agent/types";
import { DefaultChatTransport, type ChatStatus, type FileUIPart } from "ai";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { v4 as uuid } from "uuid";

export const ChatContext = createContext<UseChatHelpers<ChatMessage>>(
  null as any
);

export const ChatProvider = ({
  children,
  endpoint,
  initialMessages,
  ...options
}: {
  children: ReactNode;
  endpoint: string;
  initialMessages?: ChatMessage[];
} & UseChatOptions<ChatMessage>) => {
  const chat = useChat<ChatMessage>({
    messages: initialMessages,
    resume: true,
    transport: new DefaultChatTransport({
      api: endpoint,
      credentials: "include",
      prepareSendMessagesRequest: ({ messages }) => {
        const l = messages[messages.length - 1]!;
        const parentId = l.metadata!.parentId;
        const message = { id: l.id, parts: l.parts, parentId };
        return { body: { message } };
      },
      prepareReconnectToStreamRequest: () => ({ api: `${endpoint}/stream` }),
    }),
    generateId: uuid,
    ...options,
  });

  const hasInitialMessages = !!initialMessages;
  const hadInitialMessages = usePrevious(hasInitialMessages);
  useEffect(() => {
    if (!hadInitialMessages && hasInitialMessages) {
      chat.setMessages(initialMessages);
    }
  }, [!!initialMessages]);

  return <ChatContext.Provider value={chat}>{children}</ChatContext.Provider>;
};

export const EmptyChatProvider = ({
  children,
  onSendMessage,
}: {
  children: ReactNode;
  onSendMessage: (message: {
    text?: string;
    files?: FileUIPart[];
  }) => Promise<void>;
}) => {
  const chat = useChat<ChatMessage>();
  const [status, setStatus] = useState<ChatStatus>("ready");
  const sendMessage: UseChatHelpers<ChatMessage>["sendMessage"] = async (
    message
  ) => {
    try {
      setStatus("submitted");
      if (message && "text" in message) {
        await onSendMessage({
          text: message.text,
          files: message.files as FileUIPart[],
        });
      } else {
        console.warn(
          "Unknown message type submitted in EmptyChatProvider",
          message
        );
      }
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      throw error;
    }
  };
  return (
    <ChatContext.Provider value={{ ...chat, sendMessage, status }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => useContext(ChatContext);
