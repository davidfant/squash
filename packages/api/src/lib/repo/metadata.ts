import type { Database } from "@/database";
import * as schema from "@/database/schema";
import { Sandbox } from "@daytonaio/sdk";
import type { ProjectMetadata } from "dev-server-utils/metadata";
import { eq } from "drizzle-orm";
import { REPO_ROOT } from "./consts";

export async function generateMetadata(
  sandbox: Sandbox
): Promise<ProjectMetadata> {
  const res = await sandbox.process.executeCommand(
    "pnpm generate-metadata",
    REPO_ROOT
  );
  return JSON.parse(res.result);
}

export async function updateMetadata(
  projectId: string,
  sandbox: Sandbox,
  database: Database
) {
  const res = await sandbox.process.executeCommand(
    "pnpm generate-metadata",
    REPO_ROOT
  );
  const metadata: ProjectMetadata = JSON.parse(res.result);
  await database
    .update(schema.projects)
    .set({ metadata })
    .where(eq(schema.projects.id, projectId));
}
