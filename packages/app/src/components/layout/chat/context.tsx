import { useMounted } from "@/hooks/useMounted";
import type {
  CoreMessage,
  CoreUserMessage,
  FilePart,
  ImagePart,
  TextPart,
  UserContent,
} from "ai";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { v4 as uuid } from "uuid";

type ChatStatus = "ready" | "submitted" | "streaming" | "error";

type Message = CoreMessage & { id: string };

interface ChatContextValue {
  isLoading: boolean;
  status: ChatStatus;
  messages: Array<Message & { streaming?: boolean }>;
  previewUrl: string | undefined;
  navigateToAutomationAction(params: {
    automation: string;
    action: string;
    spanId: string;
  }): void;
  sendMessage(content: Array<TextPart | ImagePart | FilePart>): Promise<void>;
  setMessages(messages: Message[]): void;
}

const ChatContext = createContext<ChatContextValue>(null as any);

function useMessages(initial: Message[] | undefined) {
  const [messages, setMessages] = useState<Message[]>(initial ?? []);

  useEffect(() => {
    if (initial) setMessages(initial);
  }, [!!initial]);

  return [messages, setMessages] as const;
}

export function ChatProvider({
  endpoint,
  initialMessages,
  previewBaseUrl,
  children,
  autoSubmit,
  ready = true,
  onSendMessage,
}: {
  endpoint: string;
  initialMessages: Message[] | undefined;
  previewBaseUrl?: string;
  children: ReactNode;
  ready?: boolean;
  autoSubmit?: Array<TextPart | ImagePart | FilePart>;
  onSendMessage?(
    content: Array<TextPart | ImagePart | FilePart>,
    messages: Message[]
  ): Promise<boolean>;
}) {
  const isLoading = !initialMessages;
  const [messages, setMessages] = useMessages(initialMessages);
  const [streamingMessage, setChatMessage] = useState<Message>();
  const [status, setStatus] = useState<ChatStatus>("ready");

  const [previewUrl, setPreviewUrl] = useState<string | undefined>(
    previewBaseUrl
  );

  const navigateToAutomationAction = useCallback(
    (params: { automation: string; action: string; spanId: string }) =>
      !!previewBaseUrl &&
      setPreviewUrl(
        `${previewBaseUrl}/automations/${params.automation}/${params.action}/${params.spanId}`
      ),
    [previewBaseUrl]
  );

  const submit = async (message?: CoreUserMessage & { id: string }) => {
    setStatus("submitted");
    if (message) {
      setMessages((prev) => [...prev, message]);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    setMessages((prev) => [
      ...prev,
      { id: uuid(), role: "assistant", content: "response..." },
    ]);
    setStatus("ready");

    /*
    if (onSendMessage && !!message) {
      const shouldSend = await onSendMessage(message.parts ?? [], messages);
      if (!shouldSend) {
        setStatus("ready");
        return;
      }
    }

    try {
      const chunks: MessageStream.Chunk.Any[] = [];
      let prevMessagesLength = 0;
      await sseStream({
        endpoint,
        message,
        onEvent: (chunk) => {
          chunks.push(chunk);
          const messages = parseMessageStreamChunks(chunks, {
            suggestions: false,
          });
          if (messages.some((m) => !!m.parts.length)) setStatus("streaming");

          if (messages.length > prevMessagesLength) {
            const newMessages = messages.slice(
              prevMessagesLength - 1,
              messages.length - 1
            );
            setMessages((prev) => [...prev, ...newMessages]);
            prevMessagesLength = messages.length;
          }

          if (
            chunk.type === "tool.input" &&
            chunk.name === "runAutomationAction"
          ) {
            const input = chunk.input as RunAutomationActionInput;
            navigateToAutomationAction({
              automation: input.automation,
              action: input.action,
              spanId: input.runs[0]!.spanId,
            });
          }

          setChatMessage(messages[messages.length - 1]);
          console.log("EVENT", { chunks, messages });
        },
      });

      const messages = parseMessageStreamChunks(chunks);
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
    */
  };

  const mounted = useMounted();
  useEffect(() => {
    if (mounted && ready) {
      submit(
        !!autoSubmit
          ? { id: uuid(), role: "user", content: autoSubmit }
          : undefined
      );
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
        previewUrl,
        navigateToAutomationAction,
        sendMessage: (content: UserContent) =>
          submit({ id: uuid(), role: "user", content }),
        setMessages,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => useContext(ChatContext);
