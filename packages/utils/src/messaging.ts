export interface InlineCommentSettingsMessage {
  type: "InlineCommentSettings";
  enabled: boolean;
}

export interface InlineCommentMessage {
  type: "InlineComment";
  id: string;
  stack: Array<{ line: number; column: number; file: string }>;
  point: { x: number; y: number };
  box: { x: number; y: number; width: number; height: number };
}

export interface InlineCommentScreenshotMessage {
  type: "InlineCommentScreenshot";
  id: string;
  screenshot: string;
}

export interface NavigateMessage {
  type: "Navigate";
  path: string;
  pathname: string;
  params: Record<string, string | undefined>;
}

export type PostMessage =
  | InlineCommentSettingsMessage
  | InlineCommentMessage
  | InlineCommentScreenshotMessage
  | NavigateMessage;
type MessageOfType<T extends PostMessage["type"]> = Extract<
  PostMessage,
  { type: T }
>;

export type MessageHandler<T extends PostMessage> = (message: T) => void;

export function postMessage<T extends PostMessage>(
  message: T,
  targetOrigin: string = "*",
  targetWindow: Window | null = window.top
): void {
  // if (window.top && window.top !== window.self) {
  //   window.top.postMessage(message, targetOrigin);
  // }
  targetWindow?.postMessage(message, targetOrigin);
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
