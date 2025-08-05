import { gitLsFiles } from "@/lib/flyio/exec";
import { waitForMachineHealthy } from "@/lib/flyio/sandbox";
import { anthropic } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type ModelMessage,
} from "ai";
import EnvPrompt from "./prompts/env.md";
import SystemPrompt from "./prompts/system.md";
import { tools } from "./tools";
import type { ChatMessage, SandboxRuntimeContext } from "./types";

function withCacheBreakpoints(
  msgs: ModelMessage[],
  maxCount = 4
): ModelMessage[] {
  const result = [...msgs];
  const breakpoints: number[] = [];

  // Scan backwards, pick last relevant ones
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i]!;
    const isStatic = m.role === "system" || m.role === "tool";
    const isAnchor = m.role === "assistant";
    if (isStatic || isAnchor) {
      breakpoints.push(i);
      if (breakpoints.length >= maxCount) break;
    }
  }

  for (const idx of breakpoints) {
    result[idx]!.providerOptions = {
      ...result[idx]!.providerOptions,
      anthropic: { cacheControl: { type: "ephemeral" } },
    };
  }

  return result;
}

const renderPrompt = (prompt: string, vars: Record<string, string>) =>
  prompt.replace(/@(\w+)/g, (_, key) => vars[key] ?? "");

export async function streamAgent(
  messages: ChatMessage[],
  ctx: SandboxRuntimeContext
) {
  await waitForMachineHealthy(
    ctx.context.appId,
    ctx.context.machineId,
    ctx.context.apiKey
  );
  const ls = await gitLsFiles(ctx.context);
  if (!ls.success) {
    throw new Error(ls.message);
  }
  console.warn(
    "TODO: cap the file list somehow + add a listDir tool that can show the contents of a directory"
  );

  return streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    messages: [
      ...withCacheBreakpoints([{ role: "system", content: SystemPrompt }]),
      {
        role: "system",
        content: renderPrompt(EnvPrompt, {
          PWD: ctx.context.workdir,
          PLATFORM: "linux",
          OS_VERSION: "node alpine",
          TODAY: new Date().toISOString().split("T")[0]!,
          FILE_LIST: ls.files.map((f) => `${f.lines}\t${f.path}`).join("\n"),
        }),
      },
      ...withCacheBreakpoints(convertToModelMessages(messages), 3),
    ],
    tools: tools(ctx),
    stopWhen: [stepCountIs(20)],
  });
}
