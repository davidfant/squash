import type { ClaudeCodeCLIOptions, ClaudeCodeSession } from "@/schema";
import { query } from "@anthropic-ai/claude-code";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

async function hydrateSession(session: ClaudeCodeSession, dir: string) {
  const sessionFilePath = path.join(dir, `${session.id}.jsonl`);
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
    prompt: options.prompt
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("\n"),
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
