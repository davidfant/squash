import type { ClaudeCodeTools } from "@squashai/ai-sdk-claude-code";
import type { InferUITools, Tool, UIMessage } from "ai";
import type { GitCommit } from "./git";

export interface SandboxTaskToolInput {
  id: string;
  title: string;
  stream: Array<{ type: "stdout" | "stderr"; data: string }>;
}
export interface SandboxTaskToolOutput {
  summary: string | undefined;
}
export type SandboxTaskTool = Tool<SandboxTaskToolInput, SandboxTaskToolOutput>;

export type AllTools = ClaudeCodeTools & {
  GitCommit: ReturnType<typeof GitCommit>;
  SandboxTask: SandboxTaskTool;
};

export type ChatMessageData = {
  GitSha: {
    sha: string;
    title: string;
    description: string;
    url: string | undefined;
  };
  AgentSession: { type: "claude-code"; data: unknown };
  AbortRequest: { reason: string };
};
export interface ChatMessageMetadata {
  createdAt: string;
  parentId: string;
}
export type ChatMessage = UIMessage<
  ChatMessageMetadata,
  ChatMessageData,
  InferUITools<AllTools>
>;
