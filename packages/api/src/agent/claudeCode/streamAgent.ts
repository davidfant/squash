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
      //       export interface Query extends AsyncGenerator<SDKMessage, void> {
      //     /**
      //      * Control Requests
      //      * The following methods are control requests, and are only supported when
      //      * streaming input/output is used.
      //      */
      //     interrupt(): Promise<void>;
      //     setPermissionMode(mode: PermissionMode): Promise<void>;
      //     setModel(model?: string): Promise<void>;
      // }

      const agentStream = streamText({
        model: new ClaudeCodeLanguageModel(sandbox.workdir, async function* (
          req
        ) {
          const payload: FlyioSSHProxyJWTPayload = {
            app: sandbox.appId,
            cwd: sandbox.workdir,
            // TODO: resume session id
            // TODO: check if we using parent_tool_use_id can "resume" from an earlier point in a thread
            command: [
              "claude",
              "--output-format stream-json",
              "--include-partial-messages",
              "--print",
              JSON.stringify(req.prompt),
            ].join(" "),
            env: {
              ANTHROPIC_API_KEY: opts.env.ANTHROPIC_API_KEY,
              FLY_ACCESS_TOKEN: opts.env.FLY_ACCESS_TOKEN,
            },
          };
          const token = jwt.sign(
            payload,
            opts.env.FLY_SSH_PROXY_JWT_PRIVATE_KEY,
            { expiresIn: "1m" }
          );
          const stream = FlyioSSH.streamSSH(opts.env.FLY_SSH_PROXY_URL, token);
          for await (const message of stream) {
            if (message.type === "stdout") {
              console.log("stdout....", message);
              // TODO: yield this shit...
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
