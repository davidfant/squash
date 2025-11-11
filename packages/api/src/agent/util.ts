import type { Database } from "@/database";
import * as schema from "@/database/schema";
import { logger } from "@/lib/logger";
import type { Sandbox } from "@/sandbox/types";
import { eq } from "drizzle-orm";

export async function storeInitialCommitInSystemMessage(
  messages: Pick<schema.Message, "id" | "role" | "parts">[],
  sandbox: Sandbox.Manager.Base,
  db: Database
) {
  const rootMessage = messages.find((m) => m.role === "system");
  if (!rootMessage) throw new Error("Root message not found");
  if (rootMessage.parts.some((p) => p.type === "data-GitSha")) return;

  const sha = await sandbox.gitCurrentCommit();
  logger.info("Storing initial commit in system message", {
    sha,
    rootMessageId: rootMessage.id,
  });

  const title = "Starting point";
  const description =
    "This is the starting point before any changes have been made.";
  rootMessage.parts = [
    { type: "data-GitSha", data: { sha, title, description } },
  ];
  logger.info("Storing initial commit in system message", { sha });
  await db
    .update(schema.message)
    .set({ parts: rootMessage.parts })
    .where(eq(schema.message.id, rootMessage.id));
}
