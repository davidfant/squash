import type { InferUITools, UIMessage } from "ai";
import type { CustomAgentTools } from "./custom/types";
import type { gitCommit } from "./git";

export type AllTools = CustomAgentTools &
  InferUITools<{ gitCommit: ReturnType<typeof gitCommit> }>;

export type ChatMessageData = {
  gitSha: { sha: string; title: string; description: string };
};
export interface ChatMessageMetadata {
  createdAt: string;
  parentId: string;
}
export type ChatMessage = UIMessage<
  ChatMessageMetadata,
  ChatMessageData,
  AllTools
>;
