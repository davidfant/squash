import type { InferUITools, UIMessage } from "ai";
import type { ClaudeCodeAgentTools } from "./claudeCode/tools";
import type { CustomAgentTools } from "./custom/types";
import type { GitCommit } from "./git";

export type AllTools = ClaudeCodeAgentTools &
  CustomAgentTools &
  InferUITools<{ GitCommit: ReturnType<typeof GitCommit> }>;

export type ChatMessageData = {
  GitSha: { sha: string; title: string; description: string };
  AgentSession: { type: "claude-code"; data: unknown };
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
