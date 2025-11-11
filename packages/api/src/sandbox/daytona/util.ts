import { logger } from "@/lib/logger";
import type { Sandbox as DaytonaSandbox } from "@daytonaio/sdk";
import { randomUUID } from "crypto";
import escape from "shell-escape";
import type { Sandbox } from "../types";

export async function startCommand(
  sandbox: DaytonaSandbox,
  request: Sandbox.Exec.Request,
  abortSignal?: AbortSignal
): Promise<{ sessionId: string; commandId: string }> {
  const sessionId = randomUUID();
  logger.debug("Creating exec session", {
    sessionId,
    command: request.command,
    args: request.args,
  });
  await sandbox.process.createSession(sessionId);

  if (abortSignal?.aborted) {
    await sandbox.process.deleteSession(sessionId);
    logger.debug("Deleted exec session", { sessionId });
  }
  abortSignal?.addEventListener("abort", async () => {
    await sandbox.process.deleteSession(sessionId);
    logger.debug("Deleted exec session", { sessionId });
  });

  const command = await sandbox.process.executeSessionCommand(sessionId, {
    command: [
      ...Object.entries(request.env ?? {}).map(([k, v]) => `${k}=${v}`),
      escape([request.command, ...(request.args ?? [])]),
    ]
      .join(" ")
      .trim(),
    runAsync: true,
  });
  logger.debug("Started executing command", command);
  return { sessionId, commandId: command.cmdId! };
}
