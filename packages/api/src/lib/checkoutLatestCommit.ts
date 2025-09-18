import type { Database } from "@/database";
import * as schema from "@/database/schema";
import * as FlyioExec from "@/lib/flyio/exec";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

export async function checkoutLatestCommit(
  messages: Pick<schema.Message, "id" | "role" | "parts">[],
  sandbox: FlyioExec.FlyioExecSandboxContext,
  db: Database
) {
  const latestSha = await messages
    .flatMap((m) => m.parts)
    .findLast((p) => p.type === "data-GitSha");
  if (latestSha) {
    logger.info("Checking out latest commit", { sha: latestSha.data.sha });
    await FlyioExec.gitReset(sandbox, latestSha.data.sha);
  } else {
    const rootMessage = messages.find((m) => m.role === "system");
    if (!rootMessage) throw new Error("Root message not found");
    const currentSha = await FlyioExec.gitCurrentCommit(sandbox);

    const title = "Starting point";
    const description =
      "This is the starting point before any changes have been made.";
    const data = { sha: currentSha, title, description };
    logger.info("No latest commit found, using current commit", {
      sha: currentSha,
    });
    await db
      .update(schema.message)
      .set({ parts: [{ type: "data-GitSha", data }] })
      .where(eq(schema.message.id, rootMessage.id));
  }
}
