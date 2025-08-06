import type { Database } from "@/database";
import * as schema from "@/database/schema";
import * as FlyioExec from "@/lib/flyio/exec";
import { eq } from "drizzle-orm";
import type { AgentRuntimeContext } from "./types";

export async function checkoutLatestCommit(
  messages: Pick<schema.Message, "id" | "role" | "parts">[],
  runtimeContext: AgentRuntimeContext,
  db: Database
) {
  const latestSha = await messages
    .flatMap((m) => m.parts)
    .findLast((p) => p.type === "data-gitSha");
  if (latestSha) {
    await FlyioExec.gitReset(runtimeContext.sandbox, latestSha.data.sha);
  } else {
    const rootMessage = messages.find((m) => m.role === "system");
    if (!rootMessage) throw new Error("Root message not found");
    const currentSha = await FlyioExec.gitCurrentCommit(runtimeContext.sandbox);

    const title = "Starting point";
    const description =
      "This is the starting point before any changes have been made.";
    const data = { sha: currentSha, title, description };
    await db
      .update(schema.message)
      .set({ parts: [{ type: "data-gitSha", data }] })
      .where(eq(schema.message.id, rootMessage.id));
  }
}
