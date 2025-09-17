import type { ClaudeCodeCLIOptions, ClaudeCodeSession } from "@/schema";
import { query } from "@anthropic-ai/claude-code";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

async function hydrateSession(session: ClaudeCodeSession, dir: string) {
  const sessionFilePath = path.join(dir, `${session.id}.jsonl`);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    sessionFilePath,
    session.steps.map((step) => JSON.stringify(step)).join("\n")
  );
}

export async function runClaudeCode(
  options: ClaudeCodeCLIOptions,
  signal: AbortSignal
): Promise<ClaudeCodeSession> {
  const sessionsDir = path.join(
    os.homedir(),
    ".claude",
    "projects",
    options.cwd.replace(/\//g, "-")
  );

  if (options.session) await hydrateSession(options.session, sessionsDir);

  const q = query({
    prompt: (async function* () {
      const content: Array<
        | { type: "text"; text: string }
        | { type: "image"; source: { type: "url"; url: string } }
      > = options.prompt
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
      cwd: options.cwd,
      resume: options.session?.id,
      executable: "node",
      includePartialMessages: true,
      permissionMode: "bypassPermissions",
    },
  });

  signal.addEventListener("abort", () => q.interrupt());

  let sessionId = options.session?.id;
  for await (const msg of q) {
    console.log(JSON.stringify(msg));
    if (msg.type === "system" && typeof msg.session_id === "string") {
      sessionId = msg.session_id;
    }
  }

  if (!sessionId) throw new Error("Session ID not found");

  const sessionJsonl = await fs.readFile(
    path.join(sessionsDir, `${sessionId}.jsonl`),
    "utf8"
  );
  return {
    id: sessionId,
    steps: sessionJsonl
      .split("\n")
      .filter((l) => !!l.trim())
      .map((l) => JSON.parse(l)),
  };
}
