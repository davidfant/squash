import type { FlyioExecContext } from "@/lib/flyio/exec";
import type { InferUITools, UIDataTypes, UIMessage } from "ai";
import type { tools } from "./tools";

export interface SandboxRuntimeContext {
  type: "flyio";
  context: FlyioExecContext;
}

export type AgentTools = InferUITools<ReturnType<typeof tools>>;

export interface ChatMessageMetadata {
  createdAt: string;
}
export type ChatMessage = UIMessage<
  ChatMessageMetadata,
  UIDataTypes,
  AgentTools
>;
