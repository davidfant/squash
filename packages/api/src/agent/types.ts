import type { FlyioExecContext } from "@/lib/flyio/exec";
import type { InferUITools, UIDataTypes, UIMessage } from "ai";
import type { tools } from "./tools";

export interface SandboxRuntimeContext {
  type: "flyio";
  context: FlyioExecContext;
}

export type ChatTools = InferUITools<ReturnType<typeof tools>>;

export type ChatMessage = UIMessage<never, UIDataTypes, ChatTools>;
