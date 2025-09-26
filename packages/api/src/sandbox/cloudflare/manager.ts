// import {
//   getSandbox,
//   parseSSEStream,
//   type ExecEvent,
//   type Process,
// } from "@cloudflare/sandbox";
// import { DurableObject, env } from "cloudflare:workers";
// import type { Sandbox } from "../types";
// import { getRepos, performTasks } from "../util";
// import type { CloudflareSandbox } from "./sandbox";

// export class CloudflareSandboxManager
//   extends DurableObject
//   implements Sandbox.Manager.Base
// {
//   private readonly sandbox: DurableObjectStub<CloudflareSandbox>;
//   private starting: Promise<void> | null = null;
//   private devServerProcess: Process | null = null;
//   private abortController: AbortController = new AbortController();
//   private storage: Storage<{
//     options: Sandbox.Options<Sandbox.Snapshot.Config.Cloudflare>;
//   }>;

//   constructor(
//     private readonly state: DurableObjectState,
//     env: CloudflareBindings
//   ) {
//     super(state, env);
//     this.sandbox = getSandbox(env.CLOUDFLARE_SANDBOX, state.id.toString());
//   }

//   private async _getOptions(): Promise<
//     Sandbox.Options<Sandbox.Snapshot.Config.Cloudflare>
//   > {
//     const options = await this.state.storage.get<
//       Sandbox.Options<Sandbox.Snapshot.Config.Cloudflare>
//     >("options");
//     if (!options) {
//       throw new Error("CloudflareSandboxManager not initialized");
//     }
//     return options;
//   }

//   private async _setOptions(
//     options: Sandbox.Options<Sandbox.Snapshot.Config.Cloudflare>
//   ): Promise<void> {
//     await this.state.storage.put("options", options);
//   }

//   async init(options: Sandbox.Options): Promise<void> {
//     await this._setOptions(options);
//   }

//   private async _start(): Promise<void> {
//     await this.state.blockConcurrencyWhile(async () => {
//       if (!this.starting) {
//         this.starting = this.start();
//       }
//     });
//     await this.starting;
//   }

//   async start(): Promise<void> {
//     const options = await this._getOptions();
//     const repos = await getRepos(options);

//     // this.sandbox.start();
//     // TODO: wrap in tool calls
//     await performTasks(this, [
//       {
//         id: "hello-world",
//         title: "Hello World",
//         type: "command",
//         command: `echo "hello world"`,
//       },
//       {
//         id: "install-squash-cli",
//         title: "Install Squash",
//         dependsOn: ["hello-world"],
//         type: "command",
//         command: `npm install "@squashai/cli"`,
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

//     this.devServerProcess = await this.sandbox.startProcess(
//       `monitor-cli process start --instance-id ${this.state.id.toString()} --port ${
//         options.config.port
//       } -- ${options.config.tasks.dev.command}`,
//       { cwd: options.config.cwd }
//     );
//   }

//   async *execute(
//     request: Sandbox.Exec.Request
//   ): AsyncGenerator<Sandbox.Exec.Event.Any> {
//     const snapshot = await this._getOptions();
//     const stream = await this.sandbox.execStream(request.command, {
//       cwd: request.cwd,
//       env: { ...snapshot.config.env, ...request.env },
//       // TODO: "AbortSignal serialization is not enabled."
//       // signal: this.abortController.signal,
//     });

//     let startedAt = new Date();
//     for await (const event of parseSSEStream<ExecEvent>(stream)) {
//       console.log("event", event);
//       switch (event.type) {
//         case "start":
//           startedAt = new Date();
//           yield { type: event.type };
//           break;
//         case "stdout":
//         case "stderr":
//           yield { type: event.type, data: event.data! };
//           break;
//         case "complete": {
//           const endedAt = new Date();
//           const duration = endedAt.getTime() - startedAt.getTime();
//           yield { type: event.type, duration };
//           break;
//         }
//         case "error": {
//           const endedAt = new Date();
//           const duration = endedAt.getTime() - startedAt.getTime();
//           yield { type: event.type, error: event.error!, duration };
//           break;
//         }
//       }
//     }
//   }

//   async url(): Promise<string> {
//     const [options] = await Promise.all([this._getOptions(), this._start()]);
//     await this.sandbox.startAndWaitForPorts([options.config.port]);
//     const preview = await this.sandbox.exposePort(options.config.port, {
//       hostname: env.CLOUDFLARE_SANDBOX_PREVIEW_URL,
//     });
//     return preview.url;
//   }

//   async gitPush(): Promise<void> {
//     const options = await this._getOptions();
//     const repos = await getRepos(options);
//     await this.execute({
//       command: [
//         `git remote set-url origin ${repos.source.url}`,
//         `git push origin ${options.source.branch}`,
//       ].join(" && "),
//       cwd: options.config.cwd,
//     });
//   }
// }
