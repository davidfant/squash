// import { logger } from "@/lib/logger";
// import { streamSSH } from "@/sandbox/fly/ssh";
// import type { JWTPayload } from "@squashai/flyio-ssh-proxy";
// import { DurableObject, env } from "cloudflare:workers";
// import { randomUUID } from "crypto";
// import jwt from "jsonwebtoken";
// import type { Sandbox } from "../types";
// import { getRepos, storage, type Storage } from "../util";
// import {
//   allocateIPAddress,
//   createApp,
//   createMachine,
//   deleteApp,
//   getMachineState,
//   hasAllocatedIpAddress,
//   isAppCreated,
//   startMachine,
// } from "./api";

// export class FlySandboxManager
//   extends DurableObject
//   implements Sandbox.Manager.Base<Sandbox.Snapshot.Config.Docker>
// {
//   private starting: Promise<void> | null = null;
//   private abortController = new AbortController();
//   private ipAllocated = false;
//   private storage: Storage<{
//     options: Sandbox.Options<Sandbox.Snapshot.Config.Docker>;
//     fly: { appId: string; machineId: string };
//   }>;

//   constructor(
//     private readonly state: DurableObjectState,
//     env: CloudflareBindings
//   ) {
//     super(state, env);
//     this.storage = storage<any>(state.storage);
//   }

//   async init(
//     options: Sandbox.Options<Sandbox.Snapshot.Config.Docker>
//   ): Promise<void> {
//     await this.storage.set("options", options);
//   }

//   private async _start(): Promise<void> {
//     await this.state.blockConcurrencyWhile(async () => {
//       if (!this.starting) {
//         this.starting = this.start();
//       }
//     });
//     await this.starting?.catch(async (error) => {
//       await this.destroy();
//       throw error;
//     });
//   }

//   async start(): Promise<void> {
//     const options = await this.storage.get("options");
//     const fly = await this.storage.get("fly", { appId: "", machineId: "" });
//     // TODO: wrap in tool calls
//     await performTasks(this, [
//       {
//         id: "create-app",
//         title: "Setting up environment",
//         type: "function",
//         function: async () => {
//           const created = await isAppCreated(fly.appId, env.FLY_ACCESS_TOKEN);

//           if (!created.app) {
//             fly.appId = `sandbox-${randomUUID().split("-")[0]}`;
//             await createApp({
//               appId: fly.appId,
//               accessToken: env.FLY_ACCESS_TOKEN,
//               orgSlug: env.FLY_ORG_SLUG,
//             });
//             logger.info("Created app", { appId: fly.appId });
//           }

//           if (!created.machine) {
//             const machine = await createMachine({
//               appId: fly.appId,
//               accessToken: env.FLY_ACCESS_TOKEN,
//               image: options.config.image,
//               port: options.config.port,
//             });
//             fly.machineId = machine.id;
//             logger.info("Created machine", fly);
//           }

//           await this.storage.set("fly", fly);
//         },
//       },
//       {
//         id: "start-machine",
//         title: "Starting environment",
//         dependsOn: ["create-app"],
//         type: "function",
//         function: async () => {
//           const startTime = Date.now();

//           const canContinue = () =>
//             !this.abortController.signal.aborted &&
//             Date.now() - startTime < 5 * 60_000;
//           const getState = async () => {
//             const state = await getMachineState(
//               fly.appId,
//               fly.machineId,
//               env.FLY_ACCESS_TOKEN
//             );
//             logger.debug("Checking machine state", { ...fly, state });
//             return state;
//           };

//           while (canContinue()) {
//             const state = await getState();
//             if (state === "started") return;
//             if (state === "stopped") break;
//             await new Promise((resolve) => setTimeout(resolve, 500));
//           }

//           await startMachine(fly.appId, fly.machineId, env.FLY_ACCESS_TOKEN);

//           while (canContinue()) {
//             const state = await getState();
//             if (state === "started") return;
//             await new Promise((resolve) => setTimeout(resolve, 500));
//           }

//           throw new Error("Failed to start machine");
//         },
//       },
//       {
//         id: "install-squash-cli",
//         title: "Install Squash",
//         dependsOn: ["start-machine"],
//         type: "command",
//         command: `npm install -g "@squashai/cli"`,
//       },
//       {
//         id: "allocate-ip-address",
//         title: "Expose to internet",
//         dependsOn: ["create-app"],
//         type: "function",
//         function: async () => {
//           const has = await hasAllocatedIpAddress(
//             fly.appId,
//             env.FLY_ACCESS_TOKEN
//           );
//           if (!has) {
//             await allocateIPAddress(fly.appId, env.FLY_ACCESS_TOKEN);
//           }
//         },
//       },
//       // {
//       //   id: "install-squash-cli",
//       //   title: "Install Squash",
//       //   type: "command",
//       //   command: `npm install -g @squashai/cli@${env.SQUASH_CLI_VERSION}`,
//       // },
//       // {
//       //   id: "clone-repo",
//       //   title: "Clone Repo",
//       //   type: "function",
//       //   function: async () => {
//       //     // TODO: fix auth here...
//       //     const clonedTarget = await runCommand(
//       //       await this.execute({
//       //         command: `git clone --depth 1 ${repos.target.url} .`,
//       //         cwd: options.config.cwd,
//       //       })
//       //     )
//       //       .catch(() => false)
//       //       .then(() => true);
//       //     if (clonedTarget) {
//       //       logger.info("Cloned target repo", {
//       //         ...options.target,
//       //         url: repos.target.url,
//       //       });
//       //     }

//       //     const clonedSource = await runCommand(
//       //       await this.execute({
//       //         command: `git clone --depth 1 ${
//       //           options.source.branch ? `--branch ${options.source.branch}` : ""
//       //         } ${repos.target.url} .`,
//       //         cwd: options.config.cwd,
//       //       })
//       //     )
//       //       .catch(() => false)
//       //       .then(() => true);
//       //     if (clonedSource) {
//       //       logger.info("Cloned source repo", {
//       //         ...options.source,
//       //         url: repos.source.url,
//       //       });
//       //     } else {
//       //       throw new Error("Failed to clone source repo");
//       //     }
//       //   },
//       // },
//       // // {
//       // //   id: "restore-cache",
//       // //   title: "Restore Cache",
//       // //   dependsOn: ["clone-repo"],
//       // //   type: "function",
//       // //   // TODO: implement this later...
//       // //   function: () => Promise.resolve(),
//       // // },
//       // ...options.config.tasks.install.map((task) => ({
//       //   ...task,
//       //   dependsOn: [...(task.dependsOn ?? []), "clone-repo"],
//       // })),
//     ]);

//     if (Math.random()) throw new Error("test error");

//     // this.devServerProcess = await this.sandbox.startProcess(
//     //   `monitor-cli process start --instance-id ${this.state.id.toString()} --port ${
//     //     options.config.port
//     //   } -- ${options.config.tasks.dev.command}`,
//     //   { cwd: options.config.cwd }
//     // );
//   }

//   async *execute(
//     request: Sandbox.Exec.Request
//   ): AsyncGenerator<Sandbox.Exec.Event.Any> {
//     const [fly, options] = await Promise.all([
//       this.storage.get("fly"),
//       this.storage.get("options"),
//     ]);
//     const payload: JWTPayload = {
//       app: fly.appId,
//       cwd: request.cwd ?? options.config.cwd,
//     };
//     const token = jwt.sign(payload, env.FLY_SSH_PROXY_JWT_PRIVATE_KEY, {
//       expiresIn: "1m",
//       algorithm: "RS256",
//     });
//     const stream = await streamSSH({
//       url: `${env.FLY_SSH_PROXY_URL}/ssh`,
//       token,
//       env: { FLY_API_TOKEN: env.FLY_ACCESS_TOKEN },
//       command: request.command,
//       abortSignal: this.abortController.signal,
//     });

//     for await (const [event] of stream) yield event;
//   }

//   async url(): Promise<string> {
//     await this._start();
//     const fly = await this.storage.get("fly");
//     const url = new URL(env.PREVIEW_PROXY_URL);
//     url.host = `${fly.appId}.${url.host}`;
//     return url.toString();
//   }

//   async gitPush(): Promise<void> {
//     const options = await this.storage.get("options");
//     const repos = await getRepos(options);
//     await this.execute({
//       command: [
//         `git remote set-url origin ${repos.source.url}`,
//         `git push origin ${options.source.branch}`,
//       ].join(" && "),
//     });
//   }

//   async destroy(): Promise<void> {
//     const fly = await this.storage.get("fly");
//     await deleteApp(fly.appId, env.FLY_ACCESS_TOKEN).catch((error) => {
//       logger.error("Failed to delete app", { ...fly, error });
//     });
//   }
// }
