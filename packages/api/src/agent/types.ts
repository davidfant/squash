import type { FlyioExecSandboxContext } from "@/lib/flyio/exec";
import type { InferUITools, UIDataTypes, UIMessage } from "ai";
import type { createAgentTools } from "./tools";

export interface SandboxRuntimeContext {
  type: "flyio";
  sandbox: FlyioExecSandboxContext;
}

export type AgentTools = InferUITools<ReturnType<typeof createAgentTools>>;

export interface ChatMessageMetadata {
  createdAt: string;
  parentId: string;
}
export type ChatMessage = UIMessage<
  ChatMessageMetadata,
  UIDataTypes,
  AgentTools
>;
