import type { ChatMessage } from "@/agent/types";
import { createDatabase } from "@/database";
import * as schema from "@/database/schema";
import { createEnvVariables } from "@/lib/composio";
import { logger } from "@/lib/logger";
import { toAsyncIterator } from "@/lib/to-async-iterator";
import { Daytona, Sandbox as DaytonaSandbox } from "@daytonaio/sdk";
import { env } from "cloudflare:workers";
import dotenv from "dotenv";
import { eq } from "drizzle-orm";
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { setTimeout } from "node:timers/promises";
import pRetry, { AbortError } from "p-retry";
import escape from "shell-escape";
import { BaseSandboxManagerDurableObject } from "../base";
import type { Sandbox } from "../types";
import { pullLatestChanges } from "../util";
import { downloadFileFromSandbox, uploadSandboxFileToDeployment } from "./api";

export class DaytonaSandboxManager extends BaseSandboxManagerDurableObject<
  Sandbox.Snapshot.Config.Daytona,
  { sandboxId: string; devServer: { sessionId: string; commandId: string } }
> {
  name = "daytona";
  private readonly daytona = new Daytona({ apiKey: env.DAYTONA_API_KEY });
  private sandbox: DaytonaSandbox | null = null;

  private async getSandbox(): Promise<DaytonaSandbox> {
    if (this.sandbox) return this.sandbox;
    const sandboxId = await this.storage.get("sandboxId");
    const sandbox = await this.daytona.get(sandboxId);
    this.sandbox = sandbox;
    return sandbox;
  }

  private async isDevServerRunning(): Promise<boolean> {
    try {
      const [sandbox, devServer] = await Promise.all([
        this.getSandbox(),
        this.storage.get("devServer", null),
      ]);
      if (!devServer) return false;
      const command = await sandbox.process.getSessionCommand(
        devServer.sessionId,
        devServer.commandId
      );
      return command.exitCode === undefined;
    } catch {
      return false;
    }
  }

  async isStarted(): Promise<boolean> {
    try {
      const sandbox = await this.getSandbox();
      const isDevServerRunningP = this.isDevServerRunning();
      await sandbox.refreshData();
      return sandbox.state === "started" && (await isDevServerRunningP);
    } catch {
      return false;
    }
  }

  async getStartTasks(): Promise<Sandbox.Snapshot.Task.Any[]> {
    const options = await this.getOptions();
    const that = this;
    const db = createDatabase(env);
    return [
      {
        id: "create-sandbox",
        title: "Starting environment...",
        type: "function",
        function: async function* () {
          let sandbox = await that.getSandbox().catch(() => null);
          if (sandbox) {
            yield {
              type: "stdout",
              data: "Using existing sandbox\n",
              timestamp: new Date().toISOString(),
            };
          }

          if (
            !sandbox ||
            ["destroyed", "destroying"].includes(sandbox.state!)
          ) {
            yield {
              type: "stdout",
              data: "Creating new sandbox\n",
              timestamp: new Date().toISOString(),
            };
            logger.debug("Creating new sandbox", {
              snapshot: options.config.snapshot,
            });
            sandbox = await that.daytona.create({
              public: true,
              snapshot: options.config.snapshot,
              autoArchiveInterval: 24 * 60,
              autoStopInterval: 5,
            });
            logger.debug("Created new sandbox", { sandboxId: sandbox.id });
            yield {
              type: "stdout",
              data: "Created new sandbox\n",
              timestamp: new Date().toISOString(),
            };
          }

          await that.storage.set("sandboxId", sandbox.id);
          if (sandbox.state !== "started") {
            yield {
              type: "stdout",
              data: "Starting sandbox\n",
              timestamp: new Date().toISOString(),
            };
            if (sandbox.state === "stopping") {
              logger.debug("Waiting for sandbox to stop", {
                sandboxId: sandbox.id,
              });
              await sandbox.waitUntilStopped();
            }
            logger.debug("Starting sandbox", { sandboxId: sandbox.id });
            await sandbox.start().catch((error) => {
              logger.error("Error starting sandbox", {
                state: sandbox.state,
                error,
              });
              throw error;
            });
          }

          that.sandbox = sandbox;
        },
      },
      {
        id: "pull-latest-changes",
        title: "Loading latest changes...",
        type: "function",
        function: async function* () {
          const repo = await db
            .select()
            .from(schema.repo)
            .where(eq(schema.repo.id, options.branch.repoId))
            .then(([repo]) => repo);
          if (!repo) {
            throw new Error(`Repo not found: ${options.branch.repoId}`);
          }

          logger.info("Pulling latest changes", options.branch);
          yield* that.execute(
            {
              command: "sh",
              args: [
                "-c",
                pullLatestChanges({
                  gitUrl: repo.gitUrl,
                  defaultBranch: repo.defaultBranch,
                  targetBranch: options.branch.name,
                }),
              ],
              // TODO: generate creds that can only access the specific repo if it's in the R2 bucket
              env: {
                AWS_ENDPOINT_URL_S3: env.R2_REPOS_ENDPOINT_URL_S3,
                AWS_ACCESS_KEY_ID: env.R2_REPOS_ACCESS_KEY_ID,
                AWS_SECRET_ACCESS_KEY: env.R2_REPOS_SECRET_ACCESS_KEY,
                AWS_DEFAULT_REGION: "auto",
              },
              cwd: options.config.cwd,
            },
            undefined
          );
        },
        dependsOn: ["create-sandbox"],
      },
      {
        id: "install-squash-cli",
        title: "Installing Squash...",
        dependsOn: ["create-sandbox"],
        type: "command",
        command: "npm",
        args: ["install", "--global", env.SQUASH_CLI_PACKAGE],
      },
      {
        id: "setup-composio",
        title: "Setting up integrations...",
        dependsOn: ["create-sandbox"],
        type: "function",
        function: async function* () {
          yield {
            type: "stdout",
            data: "Setting up Composio...\n",
            timestamp: new Date().toISOString(),
          };

          const branch = await db
            .select()
            .from(schema.repoBranch)
            .where(eq(schema.repoBranch.id, options.branch.id))
            .then(([branch]) => branch);
          if (!branch) {
            throw new Error(`Branch not found: ${options.branch.id}`);
          }

          const envVars = { ...branch.env };

          if (!envVars.TZ) envVars.TZ = "utc";
          if (!envVars.AI_GATEWAY_BASE_URL) {
            envVars.AI_GATEWAY_BASE_URL = env.AI_GATEWAY_BASE_URL;
          }
          if (!envVars.AI_GATEWAY_API_KEY) {
            envVars.AI_GATEWAY_API_KEY = env.AI_GATEWAY_API_KEY;
          }

          if (
            !envVars.COMPOSIO_API_KEY ||
            !envVars.COMPOSIO_PROJECT_ID ||
            !envVars.COMPOSIO_PLAYGROUND_USER_ID
          ) {
            yield {
              type: "stdout",
              data: "Creating new Composio project...\n",
              timestamp: new Date().toISOString(),
            };

            const composioEnvVars = await createEnvVariables(options.branch.id);
            Object.assign(envVars, composioEnvVars);

            yield {
              type: "stdout",
              data: "Created new Composio project...\n",
              timestamp: new Date().toISOString(),
            };
          }

          if (
            JSON.stringify(envVars) !== JSON.stringify(branch.env) ||
            !(await that
              .readEnvFile()
              .then(() => true)
              .catch(() => false))
          ) {
            logger.debug("Writing env file", { envVars: Object.keys(envVars) });
            await that.writeEnvFile(envVars);
          } else {
            logger.debug("Env file is up to date", {
              envVars: Object.keys(envVars),
            });
          }
        },
      },
      ...options.config.tasks.install.map((task) => ({
        ...task,
        dependsOn: [
          ...(task.dependsOn ?? []),
          "create-sandbox",
          "setup-composio",
          "pull-latest-changes",
        ],
      })),
      {
        id: "start-dev-server",
        title: "Starting development server...",
        dependsOn: [
          "create-sandbox",
          "setup-composio",
          "pull-latest-changes",
          ...options.config.tasks.install.map((task) => task.id),
        ],
        type: "function",
        function: async function* () {
          const isDevServerRunning = await that.isDevServerRunning();

          if (!isDevServerRunning) {
            const devServer = await that.startCommand(
              {
                command: options.config.tasks.dev.command,
                args: options.config.tasks.dev.args ?? [],
              },
              undefined
            );
            yield {
              type: "stdout",
              data: "Starting development server...\n",
              timestamp: new Date().toISOString(),
            };

            await that.storage.set("devServer", devServer);
          }

          for (let attempt = 0; attempt < 100; attempt++) {
            try {
              const preview = await that.sandbox!.getPreviewLink(
                options.config.port
              );
              logger.debug("Fetching preview", { url: preview.url, attempt });
              const response = await fetch(preview.url, { method: "GET" });
              if (response.ok) {
                const text = await response.text();
                if (text.length) {
                  yield {
                    type: "stdout",
                    data: "Dev server started\n",
                    timestamp: new Date().toISOString(),
                  };
                  return;
                }
              }
              logger.debug("Waiting for dev server", { url: preview.url });
              yield {
                type: "stdout",
                data: "Waiting for dev server...\n",
                timestamp: new Date().toISOString(),
              };
            } catch (error) {
              logger.error("Error getting preview link", {
                name: (error as Error).name,
                message: (error as Error).message,
                stack: (error as Error).stack,
              });
            }

            await setTimeout(200);
          }

          throw new Error("Dev server not started");
        },
      },
    ];
  }

  async getDeployTasks(): Promise<Sandbox.Snapshot.Task.Any[]> {
    const options = await this.getOptions();
    const that = this;

    if (Math.random()) {
      options.config.build = { type: "cloudflare-worker" };
      options.config.tasks.build = [];
    }

    if (options.config.build.type === "static") {
      const build = options.config.build;
      return [
        ...options.config.tasks.build,
        {
          id: "upload-static-files",
          title: "Uploading...",
          type: "function",
          dependsOn: options.config.tasks.build.map((task) => task.id),
          function: async function* () {
            yield {
              type: "stdout",
              data: "Preparing to upload files...\n",
              timestamp: new Date().toISOString(),
            };

            const [gitSha, sandbox] = await Promise.all([
              that.gitCurrentCommit(undefined),
              that.getSandbox(),
            ]);

            const buildDir = path.join(options.config.cwd, build.dir);

            const { files } = await sandbox.fs.searchFiles(buildDir, "*.*");
            yield {
              type: "stdout",
              data: `Found ${files.length} files to upload\n`,
              timestamp: new Date().toISOString(),
            };

            yield {
              type: "stdout",
              data: "Starting parallel uploads...\n",
              timestamp: new Date().toISOString(),
            };

            const deploymentPath = `${options.branch.repoId}/${options.branch.id}/${gitSha}`;
            await Promise.all(
              files.map((file) =>
                uploadSandboxFileToDeployment(
                  sandbox.id,
                  { absolute: file, relative: path.relative(buildDir, file) },
                  deploymentPath
                )
              )
            );

            yield {
              type: "stdout",
              data: `Successfully uploaded ${files.length} files\n`,
              timestamp: new Date().toISOString(),
            };

            const url = new URL(env.DEPLOYMENT_PROXY_URL);
            url.host = `${options.branch.name}.${url.host}`;
            const db = createDatabase(env);
            await Promise.all([
              env.DOMAIN_MAPPINGS.put(url.host, deploymentPath),
              db
                .update(schema.repoBranch)
                .set({ deployment: { url: url.origin, sha: gitSha } })
                .where(eq(schema.repoBranch.id, options.branch.id)),
            ]);
          },
        },
      ];
    } else if (options.config.build.type === "cloudflare-worker") {
      return [
        ...options.config.tasks.build,
        {
          id: "deploy-cloudflare-worker",
          title: "Deploying...",
          type: "function",
          dependsOn: options.config.tasks.build.map((task) => task.id),
          function: async function* () {
            yield {
              type: "stdout",
              data: "Preparing to upload files...\n",
              timestamp: new Date().toISOString(),
            };

            const [gitSha, sandbox] = await Promise.all([
              that.gitCurrentCommit(undefined),
              that.getSandbox(),
            ]);

            const deploymentName = options.branch.repoId.split("-")[0]!;
            const stream = await that.execute(
              {
                command: "sh",
                args: [
                  "-c",
                  [
                    `pnpm wrangler build`,
                    `pnpm wrangler secret bulk ${options.config.envFile} --name ${deploymentName}`,
                    `pnpm wrangler deploy --name ${deploymentName}`,
                  ].join(" && "),
                ],
                env: {
                  CLOUDFLARE_API_TOKEN:
                    env.CLOUDFLARE_WRANGLER_DEPLOY_API_TOKEN,
                },
              },
              undefined
            );
            for await (const ev of stream) {
              if (ev.type === "stdout" || ev.type === "stderr") yield ev;
              if (ev.type === "error") throw new Error(ev.error);
            }

            // TODO: get base origin from env somehow
            const url = `https://${deploymentName}.squash.workers.dev`;

            yield {
              type: "stdout",
              data: `Successfully deployed Cloudflare Worker\n`,
              timestamp: new Date().toISOString(),
            };

            const db = createDatabase(env);
            await db
              .update(schema.repoBranch)
              .set({ deployment: { url: url, sha: gitSha } })
              .where(eq(schema.repoBranch.id, options.branch.id));
          },
        },
      ];
    } else {
      throw new Error(
        `Unsupported build type: ${JSON.stringify(options.config.build)}`
      );
    }
  }

  async getForkTasks(
    forkOptions: Sandbox.ForkOptions
  ): Promise<Sandbox.Snapshot.Task.Any[]> {
    const [options, deployTasks] = await Promise.all([
      this.getOptions(),
      this.getDeployTasks(),
    ]);

    // let screenshot: { url: string } | null = null;
    // let suggestions: schema.RepoSuggestion[] | null = null;
    const newRepoId = randomUUID();
    const gitUrl = `s3://repos/forks/${newRepoId}`;
    const defaultBranch = "master";

    const that = this;
    return [
      ...deployTasks,
      // {
      //   id: "screenshot",
      //   title: "Capturing screenshot...",
      //   type: "function",
      //   function: async function* () {
      //     const previewUrl = await that.getPreviewUrl();

      //     yield {
      //       type: "stdout",
      //       data: "Capturing screenshot...\n",
      //       timestamp: new Date().toISOString(),
      //     };

      //     screenshot = await fetch(
      //       `${env.SCREENSHOT_API_URL}?url=${encodeURIComponent(previewUrl)}`
      //     )
      //       .then((r) => r.json<{ url: string }>())
      //       .catch(() => null);
      //     suggestions = screenshot
      //       ? await generateRepoSuggestionsFromScreenshot(screenshot.url)
      //       : null;

      //     yield {
      //       type: "stdout",
      //       data: "Screenshot captured\n",
      //       timestamp: new Date().toISOString(),
      //     };
      //   },
      // },
      {
        id: "fork-and-push",
        title: "Pushing playground code...",
        dependsOn: ["screenshot"],
        type: "command",
        command: "sh",
        env: {
          AWS_ENDPOINT_URL_S3: env.R2_REPOS_ENDPOINT_URL_S3,
          AWS_ACCESS_KEY_ID: env.R2_REPOS_ACCESS_KEY_ID,
          AWS_SECRET_ACCESS_KEY: env.R2_REPOS_SECRET_ACCESS_KEY,
          AWS_DEFAULT_REGION: "auto",
        },
        args: [
          "-c",
          [
            `git remote add ${newRepoId} ${gitUrl}`,
            `git push ${newRepoId} HEAD:${defaultBranch}`,
          ]
            .map((v) => `(${v})`)
            .join(" && "),
        ],
      },
      {
        id: "create-new-repo",
        title: "Creating new repo...",
        dependsOn: [
          "screenshot",
          "fork-and-push",
          ...deployTasks.map((task) => task.id),
        ],
        type: "function",
        function: async function* () {
          yield {
            type: "stdout",
            data: "Creating new repo...\n",
            timestamp: new Date().toISOString(),
          };

          const db = createDatabase(env);
          const [repo, branch] = await Promise.all([
            db
              .select()
              .from(schema.repo)
              .where(eq(schema.repo.id, options.branch.repoId))
              .then(([repo]) => repo),
            db
              .select()
              .from(schema.repoBranch)
              .where(eq(schema.repoBranch.id, options.branch.id))
              .then(([branch]) => branch),
          ]);
          if (!repo) throw new Error(`Repo not found: ${newRepoId}`);
          if (!branch)
            throw new Error(`Branch not found: ${options.branch.id}`);

          await db.insert(schema.repo).values({
            name: forkOptions.name ?? branch.title,
            public: repo.public,
            organizationId: repo.organizationId,
            gitUrl,
            // imageUrl: screenshot?.url,
            previewUrl: branch.deployment?.url,
            defaultBranch,
            snapshot: repo.snapshot,
            createdBy: forkOptions.userId,
            // suggestions,
          });

          yield {
            type: "stdout",
            data: "Created new repo...\n",
            timestamp: new Date().toISOString(),
          };
        },
      },
    ];
  }

  async readFile(relativePath: string): Promise<Buffer> {
    await this.waitUntilStarted();

    const [options, sandbox] = await Promise.all([
      this.getOptions(),
      this.getSandbox(),
    ]);

    const cwd = options.config.cwd.replace(/\\/g, "/");
    const normalizedRelative = path.posix
      .normalize(relativePath)
      .replace(/^\/+/, "");

    if (!normalizedRelative || normalizedRelative === ".") {
      throw new Error("Cannot read directory path");
    }

    if (normalizedRelative.startsWith("..")) {
      throw new Error("Invalid file path");
    }

    const absolutePath = path.posix.join(cwd, normalizedRelative);
    const resolved = path.posix.normalize(absolutePath);
    const root = path.posix.normalize(cwd);
    const rootWithSep = root.endsWith("/") ? root : `${root}/`;

    if (!(resolved === root || resolved.startsWith(rootWithSep))) {
      throw new Error("Resolved path is outside of repository root");
    }

    logger.debug("Reading file from sandbox", {
      sandboxId: sandbox.id,
      path: resolved,
    });

    return downloadFileFromSandbox(sandbox.id, resolved);
  }

  // TODO: avoid getting sandbox and session each time. Cache this somehow...
  async *execute(
    request: Sandbox.Exec.Request,
    abortSignal: AbortSignal | undefined
  ): AsyncGenerator<Sandbox.Exec.Event.Any> {
    if (abortSignal?.aborted) return;

    const now = () => new Date().toISOString();
    const sandbox = await this.getSandbox();

    const exec = await this.startCommand(request, abortSignal);
    const gen = await toAsyncIterator<[Sandbox.Exec.Event.Any]>(async (add) => {
      try {
        add({ type: "start", timestamp: now() });

        const streamed = { stdout: "", stderr: "" };
        await pRetry(
          () =>
            sandbox.process.getSessionCommandLogs(
              exec.sessionId,
              exec.commandId,
              (data: string) => {
                add({ type: "stdout", data, timestamp: now() });
                streamed.stdout += data;
              },
              (data: string) => {
                add({ type: "stderr", data, timestamp: now() });
                streamed.stderr += data;
              }
            ),
          {
            retries: Infinity,
            factor: 2,
            maxTimeout: 0,
            onFailedAttempt: async (ctx) => {
              logger.error("Error streaming session command logs", {
                attempt: ctx.attemptNumber,
                message: ctx.error.message,
                stack: ctx.error.stack,
                name: ctx.error.name,
              });

              const result = await sandbox.process.getSessionCommand(
                exec.sessionId,
                exec.commandId
              );
              if (typeof result.exitCode === "number") {
                throw new AbortError(
                  `Command has exited with code ${result.exitCode}`
                );
              } else {
                logger.debug(
                  "Command is still running, will retry log streaming",
                  { sessionId: exec.sessionId, commandId: exec.commandId }
                );
              }
            },
          }
        ).catch(() => {});

        if (abortSignal?.aborted) {
          add({ type: "error", error: "Aborted", timestamp: now() });
          return;
        }

        const result = await sandbox.process.getSessionCommand(
          exec.sessionId,
          exec.commandId
        );

        logger.debug("Command result", {
          id: result.id,
          exitCode: result.exitCode,
        });

        if (result.exitCode === 0) {
          add({ type: "complete", timestamp: now() });
        } else {
          add({ type: "error", error: "Unknown error", timestamp: now() });
        }
      } catch (error) {
        add({
          type: "error",
          error: (error as Error).message,
          timestamp: now(),
        });
        logger.error("Error executing command", {
          stack: (error as Error).stack,
          name: (error as Error).name,
          cause: (error as Error).cause,
          message: (error as Error).message,
        });
      }
    });

    for await (const [event] of gen) {
      if (event.type === "stdout") {
        logger.debug("Exec stdout", {
          data: event.data.slice(0, 512),
          ...exec,
        });
      } else {
        logger.debug(`Exec ${event.type}`, { ...event, ...exec });
      }
      yield event;
    }
  }

  private async startCommand(
    request: Sandbox.Exec.Request,
    abortSignal: AbortSignal | undefined
  ): Promise<{ sessionId: string; commandId: string }> {
    const sandbox = await this.getSandbox();
    const sessionId = randomUUID();
    logger.debug("Creating exec session", {
      sessionId,
      command: request.command,
      args: request.args,
    });
    await sandbox.process.createSession(sessionId);

    if (abortSignal?.aborted) {
      await sandbox.process.deleteSession(sessionId);
      logger.debug("Deleted exec session", { sessionId });
    }
    abortSignal?.addEventListener("abort", async () => {
      await sandbox.process.deleteSession(sessionId);
      logger.debug("Deleted exec session", { sessionId });
    });

    const command = await sandbox.process.executeSessionCommand(sessionId, {
      command: [
        ...Object.entries(request.env ?? {}).map(([k, v]) => `${k}=${v}`),
        escape([request.command, ...(request.args ?? [])]),
      ]
        .join(" ")
        .trim(),
      runAsync: true,
    });
    logger.debug("Started executing command", command);
    return { sessionId, commandId: command.cmdId! };
  }

  // TODO: should we have concurrency control here?
  async restoreVersion(messages: ChatMessage[]): Promise<void> {
    const gitSha = messages
      .flatMap((m) => m.parts)
      .findLast((p) => p.type === "data-GitSha");
    if (!gitSha) throw new Error("No GitSha found in messages");
    const agentSession = messages
      .flatMap((m) => m.parts)
      .findLast((p) => p.type === "data-AgentSession")?.data;

    logger.info("Restoring version", { sha: gitSha.data.sha });

    await Promise.all([
      this.gitReset(gitSha.data.sha, undefined),
      (async () => {
        if (agentSession?.type !== "claude-code") return;
        const sandbox = await this.getSandbox();
        logger.info("Restoring Claude Code agent session", agentSession);

        const sessionDataPath = await this.getClaudeCodeSessionDataPath(
          agentSession.id
        );
        const sessionObj = await env.AGENT_SESSIONS.get(agentSession.objectKey);
        if (!sessionObj) {
          logger.warn("No session data available to restore", agentSession);
          return;
        }
        logger.debug("Uploading Claude Code agent session file", {
          file: sessionDataPath,
          session: agentSession,
        });
        await sandbox.fs.uploadFile(
          Buffer.from(await sessionObj.text()),
          sessionDataPath
        );
      })(),
    ]);
  }

  protected async readClaudeCodeSessionData(
    sessionId: string
  ): Promise<string> {
    const sandbox = await this.getSandbox();
    logger.debug("Reading Claude Code agent session data", { sessionId });
    const sessionDataPath = await this.getClaudeCodeSessionDataPath(sessionId);

    logger.debug("Downloading Claude Code agent session data", {
      sandboxId: sandbox.id,
      path: sessionDataPath,
    });
    const sessionData = await downloadFileFromSandbox(
      sandbox.id,
      sessionDataPath
    );

    logger.debug("Claude Code agent session data", {
      data: sessionData.toString("utf-8").slice(0, 512),
    });
    return sessionData.toString("utf-8");
  }

  private async getClaudeCodeSessionDataPath(
    sessionId: string
  ): Promise<string> {
    const [sandbox, options] = await Promise.all([
      this.getSandbox(),
      this.getOptions(),
    ]);
    const homeDir = await sandbox.getUserHomeDir();
    logger.info("Home directory", { homeDir });
    if (!homeDir) throw new Error("Home directory not found");
    return path.join(
      homeDir,
      ".claude",
      "projects",
      options.config.cwd.replace(/\//g, "-"),
      `${sessionId}.jsonl`
    );
  }

  async getPreviewUrl(): Promise<string> {
    await this.waitUntilStarted();
    const [options, sandbox] = await Promise.all([
      this.getOptions(),
      this.getSandbox(),
    ]);
    const preview = await sandbox.getPreviewLink(options.config.port);

    const target = new URL(preview.url);
    const proxy = new URL(env.PREVIEW_PROXY_URL);
    return [
      proxy.protocol,
      "//",
      target.hostname.split(".")[0],
      ".",
      proxy.host,
      target.pathname,
      target.search,
      target.hash,
    ].join("");
  }

  async listenToLogs(): Promise<Response> {
    await this.waitUntilStarted();

    const encoder = new TextEncoder();
    const devServer = await this.storage.get("devServer", null);

    if (!devServer) {
      logger.warn("Dev server logs requested before command started");
      return new Response(null, { status: 204 });
    }

    const sandbox = await this.getSandbox();
    let aborted = false;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (chunk: string | undefined | null) => {
          if (aborted || !chunk) return;
          const lines = chunk.replace(/\r/g, "").split("\n");
          if (!lines.length) return;
          const payload = lines.map((line) => `data: ${line}`).join("\n");
          controller.enqueue(encoder.encode(`${payload}\n\n`));
        };

        try {
          const history = await sandbox.process.getSessionCommandLogs(
            devServer.sessionId,
            devServer.commandId
          );

          if (history.output) send(history.output);

          await sandbox.process.getSessionCommandLogs(
            devServer.sessionId,
            devServer.commandId,
            (data: string) => send(data),
            (data: string) => send(data)
          );
        } catch (error) {
          logger.error("Failed streaming dev server logs", {
            error: {
              message: (error as Error).message,
              stack: (error as Error).stack,
              name: (error as Error).name,
            },
            sandboxId: sandbox.id,
            devServer,
          });
          send(`ERROR: ${(error as Error).message}`);
        } finally {
          controller.close();
        }
      },
      cancel() {
        aborted = true;
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
      },
    });
  }

  async destroy(): Promise<void> {
    const sandbox = await this.getSandbox();
    await sandbox.delete();
  }

  async keepAlive(): Promise<void> {
    const sandbox = await this.getSandbox();
    await sandbox.process.executeCommand("pwd");
    await sandbox.refreshData();
    logger.debug("Kept Daytona sandbox alive", {
      sandboxId: sandbox.id,
      state: sandbox.state,
    });
  }

  async readEnvFile(): Promise<Record<string, string | null>> {
    const [sandbox, options] = await Promise.all([
      this.getSandbox(),
      this.getOptions(),
    ]);
    const envVarsPath = path.join(options.config.cwd, ".env");
    const envVars = await downloadFileFromSandbox(sandbox.id, envVarsPath);
    return dotenv.parse(envVars.toString("utf-8"));
  }

  async writeEnvFile(env: Record<string, string | null>): Promise<void> {
    const [sandbox, options] = await Promise.all([
      this.getSandbox(),
      this.getOptions(),
    ]);
    const envVarsPath = path.join(options.config.cwd, ".env");
    const envString = Object.entries(env)
      .map(([k, v]) => `${k}=${v === null ? "" : JSON.stringify(v)}`)
      .join("\n");
    await sandbox.fs.uploadFile(Buffer.from(envString), envVarsPath);
  }
}
