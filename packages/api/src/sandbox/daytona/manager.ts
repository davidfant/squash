import type { ChatMessage } from "@/agent/types";
import { createDatabase } from "@/database";
import * as schema from "@/database/schema";
import { logger } from "@/lib/logger";
import { toAsyncIterator } from "@/lib/toAsyncIterator";
import { Daytona, Sandbox as DaytonaSandbox } from "@daytonaio/sdk";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { setTimeout } from "node:timers/promises";
import escape from "shell-escape";
import { BaseSandboxManagerDurableObject } from "../base";
import type { Sandbox } from "../types";

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
    return [
      {
        id: "create-sandbox",
        title: "Start environment",
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
              envVars: options.config.env,
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
        title: "Loading latest changes",
        type: "function",
        function: async function* () {
          const db = createDatabase(env);
          const repo = await db
            .select()
            .from(schema.repo)
            .where(eq(schema.repo.id, options.repo.id))
            .then(([repo]) => repo);
          if (!repo) throw new Error(`Repo not found: ${options.repo.id}`);

          logger.info("Pulling latest changes", options.repo);
          yield* that.execute(
            {
              command: "sh",
              args: [
                "-c",
                `
                set -e;

                if ! git remote get-url origin > /dev/null 2>&1; then
                  git remote add origin ${repo.url}
                  git fetch --depth 1 origin ${repo.defaultBranch}
                  git checkout --force origin/${repo.defaultBranch}
                  git checkout -b ${options.repo.branch}
                fi`,
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
        title: "Install Squash",
        dependsOn: ["create-sandbox"],
        type: "command",
        command: "npm",
        args: [
          "install",
          "--global",
          `@squashai/cli@${env.SQUASH_CLI_VERSION}`,
        ],
      },
      ...options.config.tasks.install.map((task) => ({
        ...task,
        dependsOn: [
          ...(task.dependsOn ?? []),
          "create-sandbox",
          "pull-latest-changes",
        ],
      })),
      {
        id: "start-dev-server",
        title: "Start development server",
        dependsOn: [
          "create-sandbox",
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

          while (true) {
            const preview = await that.sandbox!.getPreviewLink(
              options.config.port
            );
            const response = await fetch(preview.url, { method: "GET" });
            if (response.ok) {
              const text = await response.text();
              if (text.length) {
                yield {
                  type: "stdout",
                  data: "Dev server started\n",
                  timestamp: new Date().toISOString(),
                };
                break;
              }
            }
            logger.debug("Waiting for dev server", { url: preview.url });
            yield {
              type: "stdout",
              data: "Waiting for dev server...\n",
              timestamp: new Date().toISOString(),
            };
            await setTimeout(200);
          }
        },
      },
    ];
  }

  async *execute(
    request: Sandbox.Exec.Request,
    abortSignal: AbortSignal | undefined
  ): AsyncGenerator<Sandbox.Exec.Event.Any> {
    if (abortSignal?.aborted) return;

    const now = () => new Date().toISOString();
    const gen = await toAsyncIterator<[Sandbox.Exec.Event.Any]>(async (add) => {
      try {
        const exec = await this.startCommand(request, abortSignal);
        add({ type: "start", timestamp: now() });
        const sandbox = await this.getSandbox();

        const streamed = { stdout: "", stderr: "" };
        await sandbox.process.getSessionCommandLogs(
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
        );

        const result = await sandbox.process.getSessionCommand(
          exec.sessionId,
          exec.commandId
        );

        // TODO(fant): if we don't get reports about errors bc no AgentSession
        // is being saved, the unstreamed logic can be removed.
        const full = await sandbox.process.getSessionCommandLogs(
          exec.sessionId,
          exec.commandId
        );
        const unstreamed = {
          stdout: (full.stdout ?? "").slice(streamed.stdout.length),
          stderr: (full.stderr ?? "").slice(streamed.stderr.length),
        };
        // logger.debug("Stream data", {
        //   streamed: {
        //     stdout: streamed.stdout.length,
        //     stderr: streamed.stderr.length,
        //   },
        //   full: { stdout: full.stdout?.length, stderr: full.stderr?.length },
        //   unstreamed: {
        //     stdout: unstreamed.stdout.length,
        //     stderr: unstreamed.stderr.length,
        //   },
        // });

        if (!!unstreamed.stdout.length) {
          logger.debug("Unstreamed stdout", {
            length: unstreamed.stdout.length,
            data: unstreamed.stdout.slice(0, 512),
          });
          // add({ type: "stdout", data: unstreamed.stdout, timestamp: now() });
        }
        if (!!unstreamed.stderr.length) {
          logger.debug("Unstreamed stderr", {
            length: unstreamed.stderr.length,
            data: unstreamed.stderr.slice(0, 512),
          });
          // add({ type: "stderr", data: unstreamed.stderr, timestamp: now() });
        }

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
        logger.debug("Exec stdout", event.data.slice(0, 512));
      } else {
        logger.debug(`Exec ${event.type}`, event);
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

    // TODO: is it safe to assume that this is not async?
    this.stopAgent();
    await Promise.all([
      this.gitReset(gitSha.data.sha, undefined),
      (async () => {
        if (agentSession?.type !== "claude-code") return;
        const [sandbox, options] = await Promise.all([
          this.getSandbox(),
          this.getOptions(),
        ]);
        logger.info("Restoring Claude Code agent session", {
          id: agentSession.id,
          type: agentSession.type,
          data: JSON.stringify(agentSession.data).slice(0, 512),
        });

        const homeDir = await sandbox.getUserHomeDir();
        logger.info("Home directory", { homeDir });
        if (!homeDir) throw new Error("Home directory not found");

        const sessionsDir = path.join(
          homeDir,
          ".claude",
          "projects",
          options.config.cwd.replace(/\//g, "-")
        );
        const filePath = path.join(sessionsDir, `${agentSession.id}.jsonl`);
        const sessionData = (agentSession.data as any[])
          .map((l) => JSON.stringify(l) + "\n")
          .join("");
        logger.debug("Uploading Claude Code agent session file", {
          id: agentSession.id,
          filePath,
          data: sessionData.slice(0, 512),
        });
        await sandbox.fs.uploadFile(Buffer.from(sessionData), filePath);
      })(),
    ]);
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
      // target.hostname.replaceAll(".", "---"),
      target.hostname.split(".")[0],
      ".",
      proxy.host,
      target.pathname,
      target.search,
      target.hash,
    ].join("");
  }

  async destroy(): Promise<void> {
    const sandbox = await this.getSandbox();
    await sandbox.delete();
  }
}
