import {
  query,
  type SDKPartialAssistantMessage,
} from "@anthropic-ai/claude-agent-sdk";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { parseEnvFile } from "../lib/parse-env-file.js";
import { startTypeScriptWatch } from "../lib/typescript.js";
import type { ClaudeCodeCLIOptions, ClaudeCodeSession } from "../schema.js";

const MAX_RETRIES = 3;

type Resolve<T> = (v: T) => void;
type Reject = (e: Error) => void;
type Deferred<T> = {
  resolve: Resolve<T>;
  reject: Reject;
  promise: Promise<T>;
};

function createDeferred<T = void>(): Deferred<T> {
  let resolve: Resolve<T> | undefined;
  let reject: Reject | undefined;
  const promise = new Promise<T>((...args) => ([resolve, reject] = args));
  return Object.freeze(<Deferred<T>>{
    resolve: resolve!,
    reject: reject!,
    promise,
  });
}

function consoleLogMessage(text: string, sessionId: string) {
  const index = 0;
  console.log(
    JSON.stringify({
      type: "stream_event",
      session_id: sessionId,
      uuid: randomUUID(),
      parent_tool_use_id: null,
      event: {
        type: "content_block_start",
        index,
        content_block: { type: "text" },
      },
    } satisfies SDKPartialAssistantMessage)
  );
  console.log(
    JSON.stringify({
      type: "stream_event",
      session_id: sessionId,
      uuid: randomUUID(),
      parent_tool_use_id: null,
      event: {
        type: "content_block_delta",
        index,
        delta: { type: "text_delta", text },
      },
    } satisfies SDKPartialAssistantMessage)
  );
  console.log(
    JSON.stringify({
      type: "stream_event",
      session_id: sessionId,
      uuid: randomUUID(),
      parent_tool_use_id: null,
      event: { type: "content_block_stop", index },
    } satisfies SDKPartialAssistantMessage)
  );
}

export async function runClaudeCode(
  req: ClaudeCodeCLIOptions,
  signal: AbortSignal
): Promise<ClaudeCodeSession> {
  let sessionId = req.options?.sessionId;

  const envVars = parseEnvFile(path.join(req.cwd, ".env"));
  const deferred = createDeferred<void>();
  const tscWatchPromise = startTypeScriptWatch(req.cwd);

  retryLoop: for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const q = query({
        prompt: (async function* () {
          const content: Array<
            | { type: "text"; text: string }
            | { type: "image"; source: { type: "url"; url: string } }
          > = req.prompt
            .map((c) => {
              if (c.type === "text") {
                return { type: "text" as const, text: c.text };
              }
              if (c.type === "file" && c.mediaType.startsWith("image/")) {
                return {
                  type: "image" as const,
                  source: { type: "url" as const, url: c.data.toString() },
                };
              }
            })
            .filter((c) => !!c);
          yield {
            type: "user",
            session_id: randomUUID(),
            parent_tool_use_id: null,
            message: { role: "user", content },
          };

          await deferred.promise;
        })(),
        options: {
          cwd: req.cwd,
          resume: req.options?.sessionId,
          forkSession: !!req.options?.sessionId,
          model: req.model,
          executable: "node",
          includePartialMessages: true,
          permissionMode: "bypassPermissions",
          systemPrompt: {
            type: "preset",
            preset: "claude_code",
            append: req.options?.appendSystemPrompt,
          },
          settingSources: ["project"],
          agents: req.options?.subagents,
          mcpServers: {
            Composio: {
              type: "sse",
              url: "https://mcp-composio-production.squash.workers.dev/sse",
              headers: {
                authorization: `Bearer ${envVars.COMPOSIO_API_KEY}:${envVars.COMPOSIO_PLAYGROUND_USER_ID}`,
              },
            },
          },
          hooks: {
            PostToolUse: [
              {
                matcher: "Write|Edit|MultiEdit|NotebookEdit",
                hooks: [
                  async (input, toolUseId) => {
                    if (input.hook_event_name !== "PostToolUse" || !toolUseId) {
                      return { continue: true };
                    }

                    const tscWatch = await tscWatchPromise;
                    const toolInput = input.tool_input as { file_path: string };
                    if (!tscWatch.isFileInProject(toolInput.file_path)) {
                      return { continue: true };
                    }

                    return tscWatch
                      .waitForCompilationDone()
                      .then(() => ({
                        continue: true,
                        hookSpecificOutput: {
                          hookEventName: "PostToolUse" as const,
                          additionalContext: tscWatch.getErrorSummary(),
                        },
                      }))
                      .catch(() => ({ continue: true }));
                  },
                ],
              },
            ],
            Stop: [
              {
                hooks: [
                  async () => {
                    deferred.resolve();
                    return { continue: true };
                  },
                ],
              },
            ],
          },
        },
      });

      signal.addEventListener("abort", () => q.interrupt());

      for await (const msg of q) {
        if (msg.type === "system" && typeof msg.session_id === "string") {
          sessionId = msg.session_id;
        }

        if (
          msg.type === "result" &&
          msg.is_error &&
          // @ts-expect-error
          msg.result.includes("Internal server error")
        ) {
          console.error(
            `Internal server error detected (attempt ${attempt + 1}/${
              MAX_RETRIES + 1
            }): ${JSON.stringify(msg)}`
          );
          consoleLogMessage(
            "Failed to connect to AI, I'm trying again...",
            sessionId ?? "00000000-0000-0000-0000-000000000000"
          );
          continue retryLoop;
        }

        console.log(JSON.stringify(msg));
      }

      if (!sessionId) throw new Error("Session ID not found");
      return { id: sessionId };
    } catch (error) {
      if (signal.aborted) {
        throw new Error("Request aborted");
      }
    }
  }

  throw new Error("Internal server error after maximum retries");
}
