import { streamText } from "@/lib/ai";
import { logger } from "@/lib/logger";
import type { Sandbox } from "@/sandbox/types";
import { google } from "@ai-sdk/google";
import { ClaudeCodeLanguageModel, tools } from "@squashai/ai-sdk-claude-code";
import {
  convertToModelMessages,
  type UIMessageStreamOptions,
  type UIMessageStreamWriter,
} from "ai";
import { randomUUID } from "crypto";
import { GitCommit } from "../git";
import type { ChatMessage } from "../types";
import appendSystemPrompt from "./prompt.md";

export async function streamClaudeCodeAgent(
  writer: UIMessageStreamWriter<ChatMessage>,
  messages: ChatMessage[],
  sandbox: Sandbox.Manager.Base,
  opts: {
    threadId: string;
    previewUrl: string;
    env: CloudflareBindings;
    abortSignal: AbortSignal;
    messageMetadata: UIMessageStreamOptions<ChatMessage>["messageMetadata"];
    onScreenshot(url: string): void;
  }
) {
  const session = messages
    .flatMap((m) => m.parts)
    .findLast((p) => p.type === "data-AgentSession");

  logger.debug("Starting agent stream", {
    sandbox: sandbox.name,
    sessionDataId: session?.id ?? null,
  });

  const agentStream = streamText({
    model: new ClaudeCodeLanguageModel("", async function* ({ prompt }) {
      const stream = await sandbox.execute(
        {
          command: "squash",
          args: [
            "--prompt",
            JSON.stringify(prompt.content),
            "--options",
            JSON.stringify({ appendSystemPrompt }),
          ],
          env: {
            IS_SANDBOX: "1",
            ANTHROPIC_API_KEY: opts.env.ANTHROPIC_API_KEY,
            // SHELL: "/bin/sh",
          },
        },
        opts.abortSignal
      );

      let stdoutBuffer = "";
      for await (const ev of stream) {
        if (ev.type !== "stdout") continue;
        stdoutBuffer += ev.data;
        let newlineIndex;
        while ((newlineIndex = stdoutBuffer.indexOf("\n")) !== -1) {
          const line = stdoutBuffer.slice(0, newlineIndex).trim();
          stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
          if (!line) continue;

          try {
            const data = JSON.parse(line);
            if (
              data.type === "@squashai/cli:done" &&
              typeof data.session === "object"
            ) {
              writer.write({
                type: "data-AgentSession",
                id: randomUUID(),
                data: { type: "claude-code", data: data.session },
              });
            }

            if (typeof data === "object" && !!data.type) {
              yield data;
            }
          } catch {}
        }
      }
    }),
    messages: convertToModelMessages(messages),
    tools,
    abortSignal: opts.abortSignal,
    onError: ({ error }) => {
      logger.error("Error in ClaudeCode agent", { error });
    },
  });

  writer.merge(
    agentStream.toUIMessageStream({
      sendStart: false,
      sendFinish: false,
      messageMetadata: opts.messageMetadata,
    })
  );

  await agentStream.consumeStream();

  const shouldCommit = (await agentStream.toolCalls).some(
    (t) =>
      !t.dynamic &&
      [
        "ClaudeCodeEdit",
        "ClaudeCodeMultiEdit",
        "ClaudeCodeWrite",
        "ClaudeCodeNotebookEdit",
      ].includes(t.toolName)
  );
  if (!shouldCommit) return;

  const screenshotPromise = fetch(
    `${opts.env.SCREENSHOT_API_URL}?url=${encodeURIComponent(opts.previewUrl)}`
  ).then((r) => r.json<{ url: string }>());

  const history = messages
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

  const summary = (await agentStream.response).messages
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

  const commitStream = streamText({
    model: google("gemini-2.5-flash-lite"),
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
    tools: { GitCommit: GitCommit(sandbox) },
    toolChoice: { type: "tool", toolName: "GitCommit" },
    onStepFinish: async (step) => {
      const screenshot = await screenshotPromise.catch((e) => {
        logger.error("Error getting screenshot", e);
        return undefined;
      });
      if (screenshot) {
        await opts.onScreenshot(screenshot.url);
      }

      step.toolResults.forEach((tc) => {
        if (!tc.dynamic && tc.toolName === "GitCommit") {
          writer.write({
            type: "data-GitSha",
            id: tc.toolCallId,
            data: {
              sha: tc.output.sha,
              title: tc.input.title,
              description: tc.input.body,
              url: screenshot?.url,
            },
          });
        }
      });
    },
  });
  writer.merge(
    commitStream.toUIMessageStream({
      sendStart: false,
      sendFinish: false,
      sendReasoning: false,
      messageMetadata: opts.messageMetadata,
    })
  );
  await commitStream.consumeStream();
}
