import type { FlyioExecSandboxContext } from "@/lib/flyio/exec";
import * as FlyioSSH from "@/lib/flyio/ssh";
import { ClaudeCodeLanguageModel } from "@squash/ai-sdk-claude-code";
import type { FlyioSSHProxyJWTPayload } from "@squash/flyio-ssh-proxy";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessageStreamOptions,
} from "ai";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import type { ChatMessage } from "../types";
import { tools } from "./tools";

const stringify = (json: unknown) =>
  `'${JSON.stringify(json).replace(/'/g, `'\\''`)}'`;

export async function streamClaudeCodeAgent(
  messages: ChatMessage[],
  sandbox: FlyioExecSandboxContext,
  opts: Pick<
    UIMessageStreamOptions<ChatMessage>,
    "onFinish" | "messageMetadata"
  > & { threadId: string; env: CloudflareBindings }
) {
  const stream = createUIMessageStream<ChatMessage>({
    originalMessages: messages, // just needed for id generation
    generateId: randomUUID,
    onFinish: opts.onFinish,
    execute: async ({ writer }) => {
      const session = messages
        .flatMap((m) => m.parts)
        .findLast((p) => p.type === "data-AgentSession")?.data;

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
          command.push("--prompt", stringify([{ type: "text", text: prompt }]));

          const payload: FlyioSSHProxyJWTPayload = {
            app: sandbox.appId,
            cwd: sandbox.workdir,
            command: command.join(" "),
            env: { FLY_ACCESS_TOKEN: opts.env.FLY_ACCESS_TOKEN },
          };
          const token = jwt.sign(
            payload,
            opts.env.FLY_SSH_PROXY_JWT_PRIVATE_KEY,
            { expiresIn: "1m", algorithm: "RS256" }
          );
          const stream = FlyioSSH.streamSSH(opts.env.FLY_SSH_PROXY_URL, token);
          for await (const message of stream) {
            console.log(message);
            if (message.type === "stdout") {
              const lines = message.data
                .split("\n")
                .map((l) => l.trim())
                .filter((v) => !!v);
              for (const line of lines) {
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
      writer.write({ type: "finish" });

      // if (!changes.length) {
      //   writer.write({ type: "finish" });
      //   return;
      // }

      // const commitStream = streamText({
      //   model: wrapModelWithLangsmith(
      //     google("gemini-2.5-flash-lite"),
      //     opts.env,
      //     {
      //       runName: "Commit Message",
      //       tags: ["commit"],
      //       metadata: {
      //         changesCount: changes.length,
      //         sandboxId: runtimeContext.sandbox.appId,
      //         session_id: opts.threadId,
      //       },
      //     }
      //   ),
      //   experimental_telemetry: { isEnabled: true },
      //   messages: [
      //     {
      //       role: "system",
      //       content:
      //         "Your job is to generate ONE commit message based on the below conversation with a user and an AI code agent. The commit message has both a title and a description. The title should be a short summary of the changes, and the description should be a more detailed description of the changes. Both the title and description should be non-technical and easy to understand for someone who is not a developer. For example, avoid using technical terms like 'refactor' or 'feat: ...'",
      //     },
      //     ...convertToModelMessages(
      //       messages
      //         .map((m) => ({
      //           ...m,
      //           parts: m.parts.filter((p) => p.type === "text"),
      //         }))
      //         .filter((m) => !!m.parts.length)
      //     ),
      //     ...(await agentStream.response).messages,
      //   ],
      //   tools: {
      //     gitCommit: gitCommit(runtimeContext, () => {
      //       const deletes = changes.filter((c) => c.op === "delete");
      //       const deleteP =
      //         deletes.length &&
      //         FlyioExec.deleteFiles(
      //           deletes.map((c) => c.path),
      //           runtimeContext.sandbox
      //         );

      //       const writes = changes.filter((c) => c.op === "write");
      //       const writeP = (async () => {
      //         if (!writes.length) return;
      //         const tarPath = `${randomUUID()}.tar.gz`;
      //         try {
      //           const preUrl = `${opts.fileTransfer.url}/${
      //             opts.fileTransfer.bucketName
      //           }/${tarPath}?X-Amz-Expires=${15 * 60}`;
      //           const [presigned] = await Promise.all([
      //             new AwsClient({
      //               accessKeyId: opts.fileTransfer.accessKeyId,
      //               secretAccessKey: opts.fileTransfer.secretAccessKey,
      //               service: "s3",
      //               region: "auto",
      //             })
      //               .sign(new Request(preUrl), { aws: { signQuery: true } })
      //               .then((presigned) => presigned.url.toString()),
      //             Promise.all(
      //               writes.map(async (w) => ({
      //                 name: w.path,
      //                 data: await w.content,
      //               }))
      //             )
      //               .then(createTarGzip)
      //               .then((tar) => opts.fileTransfer.bucket.put(tarPath, tar)),
      //           ]);

      //           console.log("PATH: ", preUrl);
      //           console.log("PRESIGNED: ", presigned);

      //           await FlyioExec.writeFiles(presigned, runtimeContext.sandbox);
      //         } finally {
      //           await opts.fileTransfer.bucket.delete(tarPath);
      //         }
      //       })();

      //       return Promise.all([deleteP, writeP]);
      //     }),
      //   },
      //   toolChoice: { type: "tool", toolName: "gitCommit" },
      //   onStepFinish: (step) => {
      //     step.toolResults.forEach((tc) => {
      //       if (tc.dynamic) return;
      //       if (tc.toolName === "gitCommit") {
      //         writer.write({
      //           type: "data-gitSha",
      //           id: tc.toolCallId,
      //           data: {
      //             sha: tc.output.commitSha,
      //             title: tc.input.title,
      //             description: tc.input.body,
      //           },
      //         });
      //       }
      //     });
      //   },
      // });
      // writer.merge(
      //   commitStream.toUIMessageStream({
      //     sendStart: false,
      //     sendReasoning: false,
      //     messageMetadata: opts.messageMetadata,
      //   })
      // );
      // await commitStream.consumeStream();
    },
  });
  return createUIMessageStreamResponse({ stream });
}
