import * as FlyioExec from "@/lib/flyio/exec";
import { waitForMachineHealthy } from "@/lib/flyio/sandbox";
import { morphMerge } from "@/lib/morph";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  type ModelMessage,
  type UIMessageStreamOptions,
} from "ai";
import { randomUUID } from "crypto";
import EnvPrompt from "./prompts/env.md";
import SystemPrompt from "./prompts/system.md";
import { createAgentTools } from "./tools";
import { gitCommit } from "./tools/git";
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
  runtimeContext: SandboxRuntimeContext,
  opts: Pick<
    UIMessageStreamOptions<ChatMessage>,
    "onFinish" | "messageMetadata"
  > & { morphApiKey: string }
) {
  await waitForMachineHealthy(
    runtimeContext.sandbox.appId,
    runtimeContext.sandbox.machineId,
    runtimeContext.sandbox.apiKey
  );
  const ls = await FlyioExec.gitLsFiles(runtimeContext.sandbox);
  if (!ls.success) {
    throw new Error(ls.message);
  }
  console.warn(
    "TODO: cap the file list somehow + add a listDir tool that can show the contents of a directory"
  );

  const changes: Array<
    | { op: "write"; path: string; content: Promise<string> }
    | { op: "delete"; path: string }
  > = [];

  const stream = createUIMessageStream<ChatMessage>({
    originalMessages: messages, // just needed for id generation
    generateId: randomUUID,
    onFinish: opts.onFinish,
    execute: async ({ writer }) => {
      const agentStream = streamText({
        model: anthropic("claude-sonnet-4-20250514"),
        messages: [
          ...withCacheBreakpoints([{ role: "system", content: SystemPrompt }]),
          {
            role: "system",
            content: renderPrompt(EnvPrompt, {
              PWD: runtimeContext.sandbox.workdir,
              PLATFORM: "linux",
              OS_VERSION: "node alpine",
              TODAY: new Date().toISOString().split("T")[0]!,
              FILE_LIST: ls.files
                .map((f) => `${f.lines}\t${f.path}`)
                .join("\n"),
            }),
          },
          ...withCacheBreakpoints(convertToModelMessages(messages), 3),
        ],
        tools: createAgentTools(runtimeContext),
        stopWhen: [stepCountIs(20)],
        onStepFinish: (step) => {
          step.toolCalls.forEach((tc) => {
            if (tc.dynamic) return;
            if (tc.toolName === "writeFile") {
              const sbx = runtimeContext.sandbox;
              changes.push({
                op: "write",
                path: tc.input.path,
                content: FlyioExec.readFile(tc.input.path, sbx).then((r) =>
                  r.success
                    ? morphMerge({
                        original: r.content,
                        instructions: tc.input.instruction,
                        update: tc.input.codeEdit,
                        apiKey: opts.morphApiKey,
                      })
                    : tc.input.codeEdit
                ),
              });
            }
            if (tc.toolName === "deleteFile") {
              changes.push({ op: "delete", path: tc.input.path });
            }
          });
        },
      });

      writer.merge(
        agentStream.toUIMessageStream({
          sendFinish: false,
          messageMetadata: opts.messageMetadata,
        })
      );
      await agentStream.consumeStream();

      if (!changes.length) {
        writer.write({ type: "finish" });
        return;
      }

      const commitStream = streamText({
        model: google("gemini-2.5-flash-lite"),
        messages: [
          {
            role: "system",
            content:
              "Your job is to generate ONE commit message based on the below conversation with a user and an AI code agent. The commit message has both a title and a description. The title should be a short summary of the changes, and the description should be a more detailed description of the changes. Both the title and description should be non-technical and easy to understand for someone who is not a developer. For example, avoid using technical terms like 'refactor' or 'feat: ...'",
          },
          ...convertToModelMessages(
            messages
              .map((m) => ({
                ...m,
                parts: m.parts.filter((p) => p.type === "text"),
              }))
              .filter((m) => !!m.parts.length)
          ),
          ...(await agentStream.response).messages,
        ],
        tools: {
          gitCommit: gitCommit(runtimeContext, () =>
            Promise.all(
              changes.map(async (c) => {
                const sbx = runtimeContext.sandbox;
                if (c.op === "write") {
                  await FlyioExec.writeFile(c.path, await c.content, sbx);
                } else if (c.op === "delete") {
                  await FlyioExec.deleteFile(c.path, sbx);
                }
              })
            )
          ),
        },
        toolChoice: { type: "tool", toolName: "gitCommit" },
        // onStepFinish: (step) => {
        //   step.toolResults.forEach((tc) => {
        //     if (tc.dynamic) return;
        //     if (tc.toolName === "gitCommit") {
        //       writer.write({
        //         type: "data-gitSha",
        //         id: tc.toolCallId,
        //         data: {
        //           sha: tc.output.commitSha,
        //           title: tc.input.title,
        //           description: tc.input.body,
        //         },
        //       });
        //     }
        //   });
        // },
      });
      writer.merge(
        commitStream.toUIMessageStream({
          sendStart: false,
          sendReasoning: false,
          messageMetadata: opts.messageMetadata,
        })
      );
      await commitStream.consumeStream();
    },
  });
  return createUIMessageStreamResponse({ stream });
}
