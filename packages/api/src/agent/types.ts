import type { FlyioExecContext } from "@/lib/flyio/exec";

export interface SandboxRuntimeContext {
  type: "flyio";
  context: FlyioExecContext;
}
