import type { FlyioExecSandboxContext } from "@/lib/flyio/exec";
import type { InferUITools, UIDataTypes, UIMessage } from "ai";
import type { createAgentTools } from "./tools";
import type { gitCommit } from "./tools/git";

export interface SandboxRuntimeContext {
  type: "flyio";
  sandbox: FlyioExecSandboxContext;
}

export type AgentTools = InferUITools<ReturnType<typeof createAgentTools>>;
export type AllTools = InferUITools<
  ReturnType<typeof createAgentTools> & {
    gitCommit: ReturnType<typeof gitCommit>;
  }
>;

export interface ChatMessageMetadata {
  createdAt: string;
  parentId: string;
}
export type ChatMessage = UIMessage<ChatMessageMetadata, UIDataTypes, AllTools>;
