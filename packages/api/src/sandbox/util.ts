import { type Database } from "@/database";
import * as schema from "@/database/schema";
import { logger } from "@/lib/logger";
import { eq } from "drizzle-orm";
import type { Sandbox } from "./types";

export async function runCommand(
  gen: AsyncGenerator<Sandbox.Exec.Event.Any>
): Promise<{ stdout: string; stderr: string }> {
  let stdout = "";
  let stderr = "";
  for await (const ev of gen) {
    if (ev.type === "stdout") {
      logger.debug("Command stdout", ev.data.slice(0, 512));
      stdout += ev.data;
    }
    if (ev.type === "stderr") {
      logger.debug("Command stderr", ev.data);
      stderr += ev.data;
    }
    if (ev.type === "complete") return { stdout, stderr };
    if (ev.type === "error") new Error(ev.error);
  }

  throw new Error("Command timed out");
}

export interface Storage<T extends Record<string, unknown>> {
  get: <K extends keyof T & string, D = T[K]>(
    key: K,
    defaultValue?: D
  ) => Promise<T[K] | D>;
  set: <K extends keyof T & string>(key: K, value: T[K]) => void;
}

export const storage = <T extends Record<string, unknown>>(
  storage: DurableObjectStorage
) => ({
  get: async (key: keyof T & string, defaultValue?: T[typeof key]) => {
    const value = await storage.get<T[typeof key]>(key);
    if (!value) return defaultValue;
    return value;
  },
  set: (key: keyof T & string, value: T[typeof key]) => storage.put(key, value),
});

export async function checkoutLatestCommit(
  messages: Pick<schema.Message, "id" | "role" | "parts">[],
  sandbox: Sandbox.Manager.Base,
  db: Database
) {
  const latestSha = await messages
    .flatMap((m) => m.parts)
    .findLast((p) => p.type === "data-GitSha");
  if (latestSha) {
    logger.info("Checking out latest commit", { sha: latestSha.data.sha });
    await sandbox.gitReset(latestSha.data.sha);
  } else {
    const rootMessage = messages.find((m) => m.role === "system");
    if (!rootMessage) throw new Error("Root message not found");
    const sha = await sandbox.gitCurrentCommit();

    const title = "Starting point";
    const description =
      "This is the starting point before any changes have been made.";
    const data = { sha, title, description, url: undefined };
    logger.info("No latest commit found, using current commit", {
      sha: sha,
    });
    await db
      .update(schema.message)
      .set({ parts: [{ type: "data-GitSha", data }] })
      .where(eq(schema.message.id, rootMessage.id));
  }
}
