import type { FlyioExecSandboxContext } from "@/lib/flyio/exec";
import type { InferUITools } from "ai";
import type { createAgentTools } from "./tools";
import type { Todo } from "./tools/todoWrite";

export interface AgentRuntimeContext {
  type: "flyio";
  sandbox: FlyioExecSandboxContext;
  todos: Todo[];
}

export type CustomAgentTools = InferUITools<
  ReturnType<typeof createAgentTools>
>;
