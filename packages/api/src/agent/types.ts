import type { Sandbox } from "@/sandbox/types";
import type { ClaudeCodeTools } from "@squashai/ai-sdk-claude-code";
import type { InferUITools, Tool, UIMessage } from "ai";
import type { GitCommit } from "./git";

export interface SandboxTaskToolInput {
  id: string;
  title: string;
  events: Sandbox.Exec.Event.Any[];
}
export interface SandboxTaskToolOutput {
  summary: string | undefined;
}
export type SandboxTaskTool = Tool<SandboxTaskToolInput, SandboxTaskToolOutput>;

export type AllTools = ClaudeCodeTools & {
  GitCommit: ReturnType<typeof GitCommit>;
};

export type ChatMessageData = {
  GitSha: {
    sha: string;
    title: string;
    description: string;
    url: string | undefined;
  };
  AgentSession: { type: "claude-code"; id: string; data: unknown };
  AgentState:
    | { type: "discover" }
    | { type: "implement" }
    | { type: "clone-screenshot" };
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

export type SandboxTaskMessage = UIMessage<
  ChatMessageMetadata,
  ChatMessageData,
  InferUITools<{ SandboxTask: SandboxTaskTool }>
>;
