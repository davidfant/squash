// import { logger } from "@/lib/logger";
// import { env } from "cloudflare:workers";
// import { setTimeout } from "node:timers/promises";
// import { BaseSandboxManagerDurableObject } from "../base";
// import type { Sandbox } from "../types";
// import {
//   createSandbox,
//   getCommand,
//   getSandbox,
//   runCommand,
//   stopSandbox,
//   streamCommandLogs,
//   waitForCommand,
// } from "./api";

// export class VercelSandboxManager extends BaseSandboxManagerDurableObject<
//   Sandbox.Snapshot.Config.Vercel,
//   { sandbox: { id: string; url: string }; devServerCommandId: string }
// > {
//   name = "vercel";

//   private async isSandboxRunning(sandboxId: string): Promise<boolean> {
//     const vercelSandbox = await getSandbox(sandboxId);
//     return vercelSandbox.sandbox.status === "running";
//   }

//   private async isDevServerRunning(
//     sandboxId: string,
//     devServerCommandId: string
//   ): Promise<boolean> {
//     try {
//       const command = await getCommand(sandboxId, devServerCommandId);
//       return command.command.exitCode === null;
//     } catch {
//       return false;
//     }
//   }

//   async isStarted(): Promise<boolean> {
//     const [sandbox, devServerCommandId] = await Promise.all([
//       this.storage.get("sandbox"),
//       this.storage.get("devServerCommandId"),
//     ]);
//     if (!sandbox || !devServerCommandId) return false;
//     const [isSandboxRunning, isDevServerRunning] = await Promise.all([
//       this.isSandboxRunning(sandbox.id),
//       this.isDevServerRunning(sandbox.id, devServerCommandId),
//     ]);
//     return isSandboxRunning && isDevServerRunning;
//   }

//   async start(): Promise<void> {
//     const options = await this.getOptions();
//     await this.performTasks([
//       {
//         id: "create-sandbox",
//         title: "Setting up environment",
//         type: "function",
//         function: async () => {
//           const sandbox = await this.storage.get("sandbox");
//           if (!sandbox) return;
//           if (await this.isSandboxRunning(sandbox.id)) return;

//           const created = await createSandbox({
//             source: {
//               type: "git",
//               url: "https://github.com/vercel/sandbox-example-next.git",
//             },
//             resources: { vcpus: 2 },
//             projectId: env.VERCEL_PROJECT_ID,
//             timeout: 5 * 60 * 1000,
//             ports: [options.config.port],
//             runtime: "node22",
//           });
//           await this.storage.set("sandbox", {
//             id: created.sandbox.id,
//             url: created.routes[0]!.url,
//           });
//         },
//       },
//       {
//         id: "install-squash-cli",
//         title: "Install Squash",
//         dependsOn: ["create-sandbox"],
//         type: "command",
//         command: "npm",
//         args: [
//           "install",
//           "--global",
//           `@squashai/cli@${env.SQUASH_CLI_VERSION}`,
//         ],
//       },
//       // TODO: restore cache?
//       ...options.config.tasks.install.map((task) => ({
//         ...task,
//         dependsOn: [...(task.dependsOn ?? []), "create-sandbox"],
//       })),
//       {
//         id: "start-dev-server",
//         title: "Start development server",
//         dependsOn: [
//           "create-sandbox",
//           ...options.config.tasks.install.map((task) => task.id),
//         ],
//         type: "function",
//         function: async () => {
//           const [sandbox, devServerCommandId] = await Promise.all([
//             this.storage.get("sandbox"),
//             this.storage.get("devServerCommandId"),
//           ]);
//           if (
//             !sandbox ||
//             !devServerCommandId ||
//             !(await this.isDevServerRunning(sandbox.id, devServerCommandId))
//           ) {
//             const devServer = await runCommand(sandbox.id, {
//               command: options.config.tasks.dev.command,
//               args: options.config.tasks.dev.args ?? [],
//               env: options.config.env,
//               cwd: options.config.cwd,
//               sudo: false,
//             });

//             await this.storage.set("devServerCommandId", devServer.command.id);
//           }

//           while (true) {
//             const response = await fetch(sandbox.url, { method: "GET" });
//             if (response.ok) {
//               const text = await response.text();
//               if (text.length) break;
//             }
//             logger.debug("Waiting for dev server to be ready", {
//               url: sandbox.url,
//             });
//             await setTimeout(200);
//           }
//         },
//       },
//     ]);
//   }

//   async *execute(
//     request: Sandbox.Exec.Request
//   ): AsyncGenerator<Sandbox.Exec.Event.Any> {
//     const sandbox = await this.storage.get("sandbox");

//     const { command } = await runCommand(sandbox.id, {
//       command: request.command,
//       args: request.args ?? [],
//       env: request.env ?? {},
//       cwd: request.cwd,
//       sudo: false,
//     });
//     yield { type: "start", timestamp: new Date().toISOString() };

//     for await (const log of streamCommandLogs({
//       sandboxId: sandbox.id,
//       commandId: command.id,
//       // signal: this.abortController.signal,
//     })) {
//       yield {
//         type: log.stream,
//         data: log.data,
//         timestamp: new Date().toISOString(),
//       };
//     }

//     const result = await waitForCommand(sandbox.id, command.id);

//     if (result.command.exitCode === 0) {
//       yield { type: "complete", timestamp: new Date().toISOString() };
//     } else {
//       yield {
//         type: "error",
//         error: "Failed to execute command",
//         timestamp: new Date().toISOString(),
//       };
//     }
//   }

//   async url(): Promise<string> {
//     await this.waitUntilStarted();
//     const sandbox = await this.storage.get("sandbox");
//     await fetch(sandbox.url, { method: "GET" });
//     return sandbox.url;
//   }

//   async destroy(): Promise<void> {
//     const sandbox = await this.storage.get("sandbox");
//     await stopSandbox(sandbox.id);
//   }
// }
