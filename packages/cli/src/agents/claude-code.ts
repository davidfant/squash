import type { ClaudeCodeCLIOptions, ClaudeCodeSession } from "@/schema";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { randomUUID } from "node:crypto";

export async function runClaudeCode(
  req: ClaudeCodeCLIOptions,
  signal: AbortSignal
): Promise<ClaudeCodeSession> {
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

  let sessionId = req.options?.sessionId;
  for await (const msg of q) {
    console.log(JSON.stringify(msg));
    if (msg.type === "system" && typeof msg.session_id === "string") {
      sessionId = msg.session_id;
    }
  }

  if (!sessionId) throw new Error("Session ID not found");
  return { id: sessionId };
}
