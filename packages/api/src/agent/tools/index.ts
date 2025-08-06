import type { SandboxRuntimeContext } from "../types";
import { deleteFile, readFile, writeFile } from "./file";
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
});
