import type { ClaudeCodeCLIOptions, ClaudeCodeSession } from "@/schema";
import {
  query,
  type SDKPartialAssistantMessage,
} from "@anthropic-ai/claude-agent-sdk";
import { randomUUID } from "node:crypto";

const MAX_RETRIES = 3;

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
        })(),
        options: {
          cwd: req.cwd,
          resume: req.options?.sessionId,
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
