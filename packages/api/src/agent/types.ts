import type { ClaudeCodeTools } from "@squashai/ai-sdk-claude-code";
import type { InferUITools, UIMessage } from "ai";
import type { CustomAgentTools } from "./custom/types";
import type { GitCommit } from "./git";

export type AllTools = ClaudeCodeTools &
  CustomAgentTools &
  InferUITools<{ GitCommit: ReturnType<typeof GitCommit> }>;

export type ChatMessageData = {
  GitSha: {
    sha: string;
    title: string;
    description: string;
    url: string | undefined;
  };
  AgentSession: { type: "claude-code"; data: unknown };
  AbortRequest: { messageId: string; reason: string };
  Sandbox: {
    status: "pending" | "starting" | "running";
    checks: Array<{ name: string; ok: boolean }>;
  };
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
