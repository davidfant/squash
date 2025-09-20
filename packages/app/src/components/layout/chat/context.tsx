import { usePrevious } from "@/hooks/usePrevious";
import {
  useChat,
  type UseChatHelpers,
  type UseChatOptions,
} from "@ai-sdk/react";
import type { ChatMessage } from "@squashai/api/agent/types";
import { DefaultChatTransport } from "ai";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { v4 as uuid } from "uuid";

const ChatContext = createContext<UseChatHelpers<ChatMessage>>(null as any);

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

export const useChatContext = () => useContext(ChatContext);
