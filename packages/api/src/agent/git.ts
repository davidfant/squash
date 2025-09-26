import type { Sandbox } from "@/sandbox/types";
import { tool } from "ai";
import z from "zod";

export const GitCommit = (sandbox: Sandbox.Manager.Base) =>
  tool({
    description: `Commits the changes to the git repository.`,
    inputSchema: z.object({
      title: z.string().describe("The title of the commit."),
      body: z.string().describe("The body of the commit."),
    }),
    outputSchema: z.object({ sha: z.string() }),
    execute: async ({ title, body }) => ({
      sha: await sandbox.gitCommit(title, body),
    }),
  });
