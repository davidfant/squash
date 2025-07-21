export interface InlineCommentSettingsMessage {
  type: "InlineCommentSettings";
  enabled: boolean;
}

export interface InlineCommentMessage {
  type: "InlineComment";
  stack: Array<{ line: number; column: number; file: string }>;
  screenshot: string | null;
  box: { x: number; y: number; width: number; height: number };
}

export type PostMessage = InlineCommentSettingsMessage | InlineCommentMessage;
type MessageOfType<T extends PostMessage["type"]> = Extract<
  PostMessage,
  { type: T }
>;

export type MessageHandler<T extends PostMessage> = (message: T) => void;

export function postMessage<T extends PostMessage>(
  message: T,
  targetOrigin: string = "*"
): void {
  // if (window.top && window.top !== window.self) {
  //   window.top.postMessage(message, targetOrigin);
  // }
  window.top?.postMessage(message, targetOrigin);
}

export function addEventListener<T extends PostMessage["type"]>(
  type: T,
  handler: MessageHandler<MessageOfType<T>>
): () => void {
  const listener = (event: MessageEvent) => {
    if (event.data && event.data.type === type) {
      handler(event.data);
    }
  };

  window.addEventListener("message", listener);
  return () => {
    window.removeEventListener("message", listener);
  };
}
