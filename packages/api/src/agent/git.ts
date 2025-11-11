import { streamText } from "@/lib/ai";
import type { Sandbox } from "@/sandbox/types";
import { google } from "@ai-sdk/google";
import { type StreamTextResult, tool, type UIMessageStreamWriter } from "ai";
import z from "zod";
import type { ChatMessage } from "./types";

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

export function commitChangesToGit(opts: {
  history: ChatMessage[];
  changes: Awaited<StreamTextResult<any, any>["response"]>["messages"];
  sandbox: Sandbox.Manager.Base;
  writer: UIMessageStreamWriter<ChatMessage>;
}) {
  const history = opts.history
    .filter((m) => m.role === "assistant" || m.role === "user")
    .map((m) => ({
      role: m.role,
      content: m.parts
        .map((p) => {
          if (p.type === "text") return p.text;
          if (p.type === "tool-GitCommit")
            return JSON.stringify({ commit: p.input });
          return undefined;
        })
        .filter((c): c is string => !!c),
    }));

  const summary = opts.changes
    .filter((m) => m.role === "assistant")
    .flatMap((m) =>
      typeof m.content === "string"
        ? [{ type: "text" as const, text: m.content }]
        : m.content
    )
    .map((p) => {
      if (p.type === "text") return p.text;
      if (p.type === "tool-call") {
        return JSON.stringify({ tool: p.toolName, input: p.input });
      }
      return undefined;
    })
    .filter((c): c is string => !!c);

  return streamText({
    model: google("gemini-flash-latest"),
    messages: [
      {
        role: "system",
        content:
          "Your job is to generate ONE commit message based on the changes wrapped in <changes>. In <history> you can see a history of previous changes that have been made to the codebase. The commit message should only focus on <changes> not on <history>. The commit message has both a title and a description. The title should be a short summary of the changes, and the description should be a more detailed description of the changes. Both the title and description should be non-technical and easy to understand for someone who is not a developer. For example, avoid using technical terms like 'refactor' or 'feat: ...'",
      },
      {
        role: "user",
        content: [
          "<changes>",
          ...summary,
          "</changes>",
          "",
          "<history>",
          ...history.flatMap((h) => [
            `<${h.role}>`,
            ...h.content,
            `</${h.role}>`,
          ]),
          "</history>",
        ].join("\n"),
      },
    ],
    tools: { GitCommit: GitCommit(opts.sandbox) },
    toolChoice: { type: "tool", toolName: "GitCommit" },
    onStepFinish: async (step) => {
      step.toolResults.forEach((tc) => {
        if (!tc.dynamic && tc.toolName === "GitCommit") {
          opts.writer.write({
            type: "data-GitSha",
            id: tc.toolCallId,
            data: {
              sha: tc.output.sha,
              title: tc.input.title,
              description: tc.input.body,
            },
          });
        }
      });
    },
  });
}
