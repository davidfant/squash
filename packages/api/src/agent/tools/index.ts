import type { SandboxRuntimeContext } from "../types";
import { deleteFile, readFile, writeFile } from "./file";
import { gitCommit } from "./git";
import { grepSearch } from "./search";
import { todoWrite } from "./todoWrite";
import { webSearch } from "./webSearch";

export const createAgentTools = (runtimeContext: SandboxRuntimeContext) => ({
  readFile: readFile(runtimeContext),
  writeFile,
  deleteFile,
  grepSearch: grepSearch(runtimeContext),
  todoWrite: todoWrite(runtimeContext),
  webSearch,
  gitCommit: gitCommit(runtimeContext, async () => {
    // Default no-op implementation. In practice, this gets overridden
    // when gitCommit is used after file changes in the agent flow.
    throw new Error("gitCommit requires pending changes to commit. This tool should be called after file modifications have been made.");
  }),
});
