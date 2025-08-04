import type { SandboxRuntimeContext } from "../types";
import { deleteFile, readFile, writeFile } from "./file";
import { grepSearch } from "./search";
import { todoWrite } from "./todoWrite";
import { webSearch } from "./webSearch";

export const tools = (ctx: SandboxRuntimeContext) => ({
  readFile: readFile(ctx),
  writeFile: writeFile(ctx),
  deleteFile: deleteFile(ctx),
  grepSearch: grepSearch(ctx),
  todoWrite: todoWrite(ctx),
  webSearch,
});
