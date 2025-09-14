import type { FlyioExecSandboxContext } from "@/lib/flyio/exec";
import * as FlyioExec from "@/lib/flyio/exec";
import { tool } from "ai";
import z from "zod";

export const GitCommit = (
  sandbox: FlyioExecSandboxContext,
  applyChanges?: () => Promise<unknown>
) =>
  tool({
    description: `Commits the changes to the git repository.`,
    inputSchema: z.object({
      title: z.string().describe("The title of the commit."),
      body: z.string().describe("The body of the commit."),
    }),
    outputSchema: z.object({ commitSha: z.string() }),
    execute: async ({ title, body }) => {
      await applyChanges?.();
      const commitSha = await FlyioExec.gitCommit(sandbox, title, body);
      return { commitSha };
    },
  });
