import type { FlyioExecSandboxContext } from "@/lib/flyio/exec";
import type { InferUITools, UIMessage } from "ai";
import type { createAgentTools } from "./tools";
import type { gitCommit } from "./tools/git";
import type { Todo } from "./tools/todoWrite";

export interface AgentRuntimeContext {
  type: "flyio";
  sandbox: FlyioExecSandboxContext;
  todos: Todo[];
}

export type AgentTools = InferUITools<ReturnType<typeof createAgentTools>>;
export type AllTools = InferUITools<
  ReturnType<typeof createAgentTools> & {
    gitCommit: ReturnType<typeof gitCommit>;
  }
>;

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
