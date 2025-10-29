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
import { env } from "cloudflare:workers";
import { randomUUID } from "crypto";
import path from "path";
import { getDocsPrompt } from "../docs";
import { GitCommit } from "../git";
import type { AllTools, ChatMessage } from "../types";
import appendSystemPrompt from "./prompt.md";

export async function streamClaudeCodeAgent(opts: {
  writer: UIMessageStreamWriter<ChatMessage>;
  messages: ChatMessage[];
  sandbox: Sandbox.Manager.Base;
  threadId: string;
  sessionId: string | undefined;
  previewUrl: string;
  abortSignal: AbortSignal;
  messageMetadata: UIMessageStreamOptions<ChatMessage>["messageMetadata"];
  readSessionData(sessionId: string): Promise<string>;
  onScreenshot(url: string): void;
}) {
  logger.debug("Starting Claude Code stream", {
    sandbox: opts.sandbox.name,
    sessionId: opts.sessionId,
  });

  const keepAliveInterval = setInterval(() => {
    logger.debug("Keeping sandbox alive", { sandbox: opts.sandbox.name });
    opts.sandbox
      .keepAlive()
      .catch((e) => logger.error("Error keeping sandbox alive", e));
  }, 10_000);

  try {
    let sessionId: string | undefined = undefined;
    const agentStream = streamText({
      model: new ClaudeCodeLanguageModel("", async function* ({ prompt }) {
        const stream = await opts.sandbox.execute(
          {
            command: "squash",
            args: [
              "--prompt",
              JSON.stringify(prompt.content),
              "--options",
              JSON.stringify({
                appendSystemPrompt: [
                  appendSystemPrompt,
                  getDocsPrompt(["trpc"]),
                ].join("\n"),
                sessionId: opts.sessionId ?? undefined,
              }),
              "--model",
              "claude-sonnet-4-5-20250929",
            ],
            env: { IS_SANDBOX: "1", ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY },
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
                sessionId = data.session.id;
              }

              if (typeof data === "object" && !!data.type) {
                yield data;
              }
            } catch {}
          }
        }
      }),
      messages: convertToModelMessages(opts.messages),
      tools,
      abortSignal: opts.abortSignal,
      onError: ({ error }) =>
        logger.error("Error in ClaudeCode agent", { error }),
    });

    const usedTools = new Set<string>();
    for await (const msg of agentStream.toUIMessageStream<ChatMessage>({
      sendStart: false,
      sendFinish: false,
      messageMetadata: opts.messageMetadata,
    })) {
      opts.writer.write(msg);
      if (msg.type === "tool-input-start") {
        usedTools.add(msg.toolName);
      }
    }

    if (opts.abortSignal.aborted) throw new Error("Cancelled");
    if (!sessionId) throw new Error("Claude Code session not detected");

    const sessionDataPromise = opts.readSessionData(sessionId);

    const shouldCommit = (
      [
        "ClaudeCode__Edit",
        "ClaudeCode__MultiEdit",
        "ClaudeCode__Write",
        "ClaudeCode__NotebookEdit",
      ] satisfies Array<keyof AllTools>
    ).some((t) => usedTools.has(t));
    logger.debug("Should commit", { shouldCommit, usedTools: [...usedTools] });
    if (shouldCommit) {
      const screenshotAbortController = new AbortController();
      const screenshotPromise = fetch(
        `${env.SCREENSHOT_API_URL}?url=${encodeURIComponent(opts.previewUrl)}`,
        {
          signal: screenshotAbortController.signal,
        }
      ).then((r) => r.json<{ url: string }>());
      setTimeout(() => screenshotAbortController.abort(), 5_000);

      const history = opts.messages
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
          logger.debug("Waiting for screenshot");
          const screenshot = await screenshotPromise.catch((e) => {
            logger.error("Error getting screenshot", e);
            return undefined;
          });
          logger.debug("Got screenshot", screenshot);

          if (screenshot) {
            await opts.onScreenshot(screenshot.url);
          }

          step.toolResults.forEach((tc) => {
            if (!tc.dynamic && tc.toolName === "GitCommit") {
              opts.writer.write({
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
      for await (const msg of commitStream.toUIMessageStream<ChatMessage>({
        sendStart: false,
        sendFinish: false,
        sendReasoning: false,
        messageMetadata: opts.messageMetadata,
      })) {
        opts.writer.write(msg);
      }
    }

    logger.debug("Storing agent session", { sessionId });
    const sessionData = await sessionDataPromise;
    const objectKey = path.join(
      "claude-code",
      opts.threadId,
      sessionId,
      opts.messages.slice(-1)[0]?.id ?? "unknown-message",
      `${Date.now()}.jsonl`
    );
    logger.debug("Putting agent session in R2", { key: objectKey });
    await env.AGENT_SESSIONS.put(objectKey, sessionData, {
      httpMetadata: { contentType: "application/jsonl" },
    });

    opts.writer.write({
      type: "data-AgentSession",
      id: randomUUID(),
      data: { type: "claude-code", id: sessionId, objectKey },
    });
  } finally {
    clearInterval(keepAliveInterval);
  }
}
