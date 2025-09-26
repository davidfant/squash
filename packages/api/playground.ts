import { google } from "@ai-sdk/google";
import { streamText, tool } from "ai";
import { z } from "zod";

// async function main() {
//   const sandbox = await Sandbox.create({
//     source: {
//       url: "https://github.com/vercel/sandbox-example-next.git",
//       type: "git",
//     },
//     resources: { vcpus: 2 },
//     timeout: ms("5m"),
//     ports: [3000],
//     runtime: "node22",
//   });

//   // const install = await sandbox.runCommand({
//   //   cmd: "npm",
//   //   args: ["install", "--loglevel", "info"],
//   //   stderr: process.stderr,
//   //   stdout: process.stdout,
//   // });

//   console.log(`Installing dependencies...`);
//   await sandbox.runCommand({
//     cmd: "npm",
//     args: ["install", "--global", "@squashai/cli"],
//     stderr: process.stderr,
//     stdout: process.stdout,
//   });
//   console.log(`Installed dependencies...`);

//   // if (install.exitCode != 0) {
//   //   console.log("installing packages failed");
//   //   process.exit(1);
//   // }

//   // console.log(`Starting the development server...`);
//   // await sandbox.runCommand({
//   //   cmd: "npm",
//   //   args: ["run", "dev"],
//   //   stderr: process.stderr,
//   //   stdout: process.stdout,
//   //   detached: true,
//   // });

//   await setTimeout(500);
//   spawn("open", [sandbox.domain(3000)]);
// }

// import { google } from "@ai-sdk/google";
// import { JWTPayload } from "@squashai/flyio-ssh-proxy";
// import { streamText, TextStreamPart, tool } from "ai";
// import { randomUUID } from "crypto";
// import jwt from "jsonwebtoken";
// import { z } from "zod";
// import type { SandboxTaskTool, SandboxTaskToolInput } from "./src/agent/types";
// import type { RepoBranchSandbox, SandboxTask } from "./src/database/schema";
// import { streamSSH } from "./src/sandbox/fly/ssh";

// // export type SandboxTaskTool = Tool<
// //   {
// //     id: string;
// //     title: string;
// //     stream: Array<{ type: "stdout" | "stderr"; data: string }>;
// //   },
// //   { status: "success" | "failure"; summary: string | undefined }
// // >;

// async function* sandboxTaskToToolCall(
//   task: SandboxTask,
//   sandbox: RepoBranchSandbox,
//   abortSignal: AbortSignal
// ): AsyncGenerator<TextStreamPart<{ SandboxTask: SandboxTaskTool }>, void> {
//   const toolCallId = randomUUID();

//   const input: SandboxTaskToolInput = {
//     id: task.id,
//     title: task.title,
//     stream: [],
//   };
//   let errorMessage: string | undefined = undefined;

//   yield { type: "tool-input-start", id: toolCallId, toolName: "SandboxTask" };
//   yield {
//     type: "tool-input-delta",
//     id: toolCallId,
//     delta: `{"id":"${task.id}","title":"${task.title}","stream":[`,
//   };

//   const payload: JWTPayload = { app: sandbox.appId, cwd: sandbox.workdir };
//   const token = jwt.sign(payload, process.env.FLY_SSH_PROXY_JWT_PRIVATE_KEY!, {
//     expiresIn: "1m",
//     algorithm: "RS256",
//   });

//   for await (const [event] of streamSSH({
//     url: `${process.env.FLY_SSH_PROXY_URL}/ssh`,
//     token,
//     env: { FLY_API_TOKEN: process.env.FLY_ACCESS_TOKEN! },
//     command: task.command,
//     abortSignal,
//   })) {
//     if (event.type === "stdout" || event.type === "stderr") {
//       const item = { type: event.type, data: event.data };
//       yield {
//         type: "tool-input-delta",
//         id: toolCallId,
//         delta:
//           input.stream.length === 0
//             ? JSON.stringify(item)
//             : `,${JSON.stringify(item)}`,
//       };
//       input.stream.push(item);
//     } else if (event.type === "error") {
//       errorMessage = event.data.message;
//     } else if (event.type === "exit") {
//       if (event.data.code !== 0 && !errorMessage) {
//         errorMessage = "Unknown error";
//       }
//       break;
//     }
//   }

//   yield { type: "tool-input-delta", id: toolCallId, delta: `]}` };
//   yield { type: "tool-input-end", id: toolCallId };
//   yield {
//     type: "tool-call",
//     toolCallId,
//     toolName: "SandboxTask",
//     input,
//   };

//   if (!!errorMessage) {
//     yield {
//       type: "tool-error",
//       toolCallId,
//       toolName: "SandboxTask",
//       input,
//       error: errorMessage,
//     };
//   } else {
//     yield {
//       type: "tool-result",
//       toolCallId,
//       toolName: "SandboxTask",
//       input,
//       output: { summary: undefined },
//     };
//   }
// }

async function main2() {
  console.log("🚀 Starting AI SDK streamText with echo tool...\n");

  try {
    const result = await streamText({
      model: google("gemini-2.5-flash"),
      prompt:
        'Please use the echo tool to repeat back "Hello from the echo tool!"',
      tools: {
        echo: tool({
          description: "Echo back the provided message",
          inputSchema: z.object({
            message: z.string().describe("The message to echo back"),
          }),
          execute: async ({ message }: { message: string }) => {
            console.log("🔧 Echo tool called with message:", message);
            return {
              message: message,
              timestamp: new Date().toISOString(),
            };
          },
        }),
      },
    });

    console.log("📝 Streaming response parts:\n");

    // Stream and log all parts
    // for await (const part of result.fullStream) {
    //   console.log("❤️", part);
    //   console.log(""); // Empty line for readability
    // }
    for await (const part of result.toUIMessageStream()) {
      console.log("❤️", part);
      console.log(""); // Empty line for readability
    }

    // Get the final result
    const finalText = await result.text;
    console.log("🎉 Final response text:");
    console.log(finalText);
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// async function main() {
//   for await (const part of sandboxTaskToToolCall(
//     {
//       id: "1",
//       title: "Test",
//       command: "echo 'Hello, world!'",
//     },
//     {
//       type: "flyio",
//       appId: "sandbox-df539fd2",
//       workdir: "/repo",
//       machineId: "7849102a425268",
//     },
//     new AbortController().signal
//   )) {
//     console.log("❤️", part);
//   }
// }

// // Run the main function
// main().catch(console.error);

main2().catch(console.error);
