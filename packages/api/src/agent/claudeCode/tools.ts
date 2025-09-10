import { tool, type InferUITools, type ToolSet } from "ai";
import z from "zod";

export const tools = [
  "Task",
  "Bash",
  "Glob",
  "Grep",
  "ExitPlanMode",
  "Read",
  "Edit",
  "MultiEdit",
  "Write",
  "NotebookEdit",
  "WebFetch",
  "TodoWrite",
  "WebSearch",
  "BashOutput",
  "KillBash",
].reduce(
  (acc, toolName) => ({
    ...acc,
    [toolName]: tool({
      type: "provider-defined",
      id: `anthropic.${toolName}`,
      name: toolName,
      args: {},
      inputSchema: z.any(),
    }),
  }),
  {} as ToolSet
);

export type ClaudeCodeAgentTools = InferUITools<typeof tools>;
