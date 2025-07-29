import type { ToolCallPart, ToolResultPart } from "ai";

// subset of ai.TextPart
export interface TextPart {
  type: "text";
  text: string;
}

// subset of ai.ImagePart
export interface ImagePart {
  type: "image";
  image: string;
  mimeType?: string;
}

// subset of ai.FilePart
export interface FilePart {
  type: "file";
  data: string;
  filename?: string;
  mimeType: string;
}

export interface ReasoningPart {
  type: "reasoning";
  text: string;
}

export interface RedactedReasoningPart {
  type: "redacted-reasoning";
  data: string;
}

export type UserMessagePart = TextPart | ImagePart | FilePart;
export type AssistantMessagePart =
  | TextPart
  | FilePart
  | ReasoningPart
  | RedactedReasoningPart
  | ToolCallPart;
export type ToolMessagePart = ToolResultPart;

export interface UserMessage {
  id: string;
  role: "user";
  content: UserMessagePart[];
  createdAt: string;
}

export interface AssistantMessage {
  id: string;
  role: "assistant";
  content: AssistantMessagePart[];
  createdAt: string;
}

export interface ToolMessage {
  id: string;
  role: "tool";
  content: ToolMessagePart[];
  createdAt: string;
}

export type AnyMessage = UserMessage | AssistantMessage | ToolMessage;
