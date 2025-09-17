import { streamText } from "@/lib/ai";
import type { FlyioExecSandboxContext } from "@/lib/flyio/exec";
import * as FlyioSSH from "@/lib/flyio/ssh";
import { logger } from "@/lib/logger";
import { google } from "@ai-sdk/google";
import { ClaudeCodeLanguageModel, tools } from "@squashai/ai-sdk-claude-code";
import type { JWTPayload } from "@squashai/flyio-ssh-proxy";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessageStreamOptions,
} from "ai";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import { GitCommit } from "../git";
import type { ChatMessage } from "../types";
import appendSystemPrompt from "./prompt.md";

const stringify = (json: unknown) =>
  `'${JSON.stringify(json).replace(/'/g, `'\\''`)}'`;

export async function streamClaudeCodeAgent(
  messages: ChatMessage[],
  sandbox: FlyioExecSandboxContext,
  opts: Pick<
    UIMessageStreamOptions<ChatMessage>,
    "onFinish" | "messageMetadata"
  > & { threadId: string; env: CloudflareBindings; abortSignal: AbortSignal }
) {
  const stream = createUIMessageStream<ChatMessage>({
    originalMessages: messages, // just needed for id generation
    generateId: randomUUID,
    onFinish: opts.onFinish,
    execute: async ({ writer }) => {
      const session = messages
        .flatMap((m) => m.parts)
        .findLast((p) => p.type === "data-AgentSession")?.data;

      logger.debug("Starting agent stream", {
        sandbox: sandbox.appId,
        machineId: sandbox.machineId,
        session,
      });
      const agentStream = streamText({
        model: new ClaudeCodeLanguageModel(sandbox.workdir, async function* ({
          prompt,
        }) {
          const command: string[] = [];
          // TODO: deny read/write to files that are gitignored
          // TODO: should we move this to @squashai/cli?
          // allows bypassPermissions when running in as sudo user
          command.push(`IS_SANDBOX=1`);
          command.push(`ANTHROPIC_API_KEY=${opts.env.ANTHROPIC_API_KEY}`);
          command.push("squash");
          if (session) command.push("--session", stringify(session.data));
          command.push("--cwd", sandbox.workdir);
          command.push("--prompt", stringify(prompt));
          command.push("--append-system-prompt", stringify(appendSystemPrompt));

          const payload: JWTPayload = {
            app: sandbox.appId,
            cwd: sandbox.workdir,
          };
          const token = jwt.sign(
            payload,
            opts.env.FLY_SSH_PROXY_JWT_PRIVATE_KEY,
            { expiresIn: "1m", algorithm: "RS256" }
          );
          logger.debug("Streaming SSH", {
            url: opts.env.FLY_SSH_PROXY_URL,
            payload,
          });

          let stdoutBuffer = "";
          const stream = await FlyioSSH.streamSSH({
            url: opts.env.FLY_SSH_PROXY_URL,
            token,
            env: { FLY_ACCESS_TOKEN: opts.env.FLY_ACCESS_TOKEN },
            command: command.join(" "),
            abortSignal: opts.abortSignal,
          });

          for await (const [message] of stream) {
            if (message.type !== "stdout") continue;
            stdoutBuffer += message.data;
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
      });

      writer.merge(
        agentStream.toUIMessageStream({
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
      if (!shouldCommit) {
        writer.write({ type: "finish" });
        return;
      }

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
        onStepFinish: (step) => {
          step.toolResults.forEach((tc) => {
            if (!tc.dynamic && tc.toolName === "GitCommit") {
              writer.write({
                type: "data-GitSha",
                id: tc.toolCallId,
                data: {
                  sha: tc.output.commitSha,
                  title: tc.input.title,
                  description: tc.input.body,
                },
              });
            }
          });
        },
      });
      writer.merge(
        commitStream.toUIMessageStream({
          sendStart: false,
          sendReasoning: false,
          messageMetadata: opts.messageMetadata,
        })
      );
      await commitStream.consumeStream();
    },
  });
  return createUIMessageStreamResponse({ stream });
}
