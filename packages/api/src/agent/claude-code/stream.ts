import { createDatabase } from "@/database";
import * as schema from "@/database/schema";
import { streamText } from "@/lib/ai";
import { logger } from "@/lib/logger";
import type { Sandbox } from "@/sandbox/types";
import { ClaudeCodeLanguageModel, tools } from "@squashai/ai-sdk-claude-code";
import {
  convertToModelMessages,
  type UIMessageStreamOptions,
  type UIMessageStreamWriter,
} from "ai";
import { env } from "cloudflare:workers";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import path from "path";
import { getDocsPrompt } from "../docs";
import { commitChangesToGit } from "../git";
import type { AllTools, ChatMessage } from "../types";
import appendSystemPrompt from "./prompt.md";
import { subagents } from "./subagents";

export async function streamClaudeCodeAgent(opts: {
  writer: UIMessageStreamWriter<ChatMessage>;
  messages: ChatMessage[];
  sandbox: Sandbox.Manager.Base;
  threadId: string;
  branchId: string;
  sessionId: string | undefined;
  previewUrl: string;
  abortSignal: AbortSignal;
  messageMetadata: UIMessageStreamOptions<ChatMessage>["messageMetadata"];
  readSessionData(sessionId: string): Promise<string>;
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
                  getDocsPrompt([
                    "ai-gateway",
                    "cloudflare-worker",
                    "composio",
                    "shadcn",
                    "trpc",
                  ]),
                ].join("\n"),
                sessionId: opts.sessionId ?? undefined,
                subagents: Object.fromEntries(
                  subagents.map(({ name, ...s }) => [name, s])
                ),
              }),
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

    await Promise.all([
      (async () => {
        const sessionData = await opts.readSessionData(sessionId);
        logger.debug("Storing agent session", { sessionId });
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
      })(),
      (async () => {
        const shouldCommit = (
          [
            "ClaudeCode__Edit",
            "ClaudeCode__MultiEdit",
            "ClaudeCode__Write",
            "ClaudeCode__NotebookEdit",
          ] satisfies Array<keyof AllTools>
        ).some((t) => usedTools.has(t));
        logger.debug("Should commit", {
          shouldCommit,
          usedTools: [...usedTools],
        });

        if (shouldCommit) {
          const commitStream = commitChangesToGit({
            history: opts.messages,
            changes: (await agentStream.response).messages,
            sandbox: opts.sandbox,
            writer: opts.writer,
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
      })(),
      (async () => {
        logger.debug("Reading env file", { branchId: opts.branchId });
        const db = createDatabase(env);
        const [envVars, repo] = await Promise.all([
          opts.sandbox.readEnvFile(),
          db
            .select()
            .from(schema.repo)
            .innerJoin(
              schema.repoBranch,
              eq(schema.repo.id, schema.repoBranch.repoId)
            )
            .then(([repo]) => repo),
        ]);
        if (!repo) {
          throw new Error(`Repo for branch not found: ${opts.branchId}`);
        }
        await db.update(schema.repo).set({ env: envVars });
      })(),
    ]);
  } catch (error) {
    logger.error("Error in Claude Code stream", {
      message: (error as Error).message,
      stack: (error as Error).stack,
      name: (error as Error).name,
      cause: (error as Error).cause,
    });
    throw error;
  } finally {
    clearInterval(keepAliveInterval);
  }
}
