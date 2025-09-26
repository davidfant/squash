import { logger } from "@/lib/logger";
import { toAsyncIterator } from "@/lib/toAsyncIterator";
import { Daytona, Sandbox as DaytonaSandbox } from "@daytonaio/sdk";
import { env } from "cloudflare:workers";
import { randomUUID } from "node:crypto";
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

  private async isDevServerRunning(
    sandboxId: string,
    devServer: { sessionId: string; commandId: string }
  ): Promise<boolean> {
    try {
      const sandbox = await this.daytona.get(sandboxId);
      const command = await sandbox.process.getSessionCommand(
        devServer.sessionId,
        devServer.commandId
      );
      return command.exitCode === 0;
    } catch {
      return false;
    }
  }

  async isStarted(): Promise<boolean> {
    const sandboxId = await this.storage.get("sandboxId");
    try {
      const sandbox = await this.daytona.get(sandboxId);
      return sandbox.state === "started";
    } catch {
      return false;
    }
  }

  async start(): Promise<void> {
    const [options, sandboxId] = await Promise.all([
      this.getOptions(),
      this.storage.get("sandboxId", null),
    ]);

    await this.performTasks([
      {
        id: "create-sandbox",
        title: "Start environment",
        type: "function",
        function: async () => {
          const sandbox = await (async () => {
            if (sandboxId) {
              const existing = await this.daytona
                .get(sandboxId)
                .catch(() => null);
              if (existing) return existing;
            }

            return this.daytona.create({
              public: true,
              snapshot: options.config.snapshot,
              autoArchiveInterval: 24 * 60,
              autoStopInterval: 5,
              envVars: options.config.env,
            });
          })();

          await this.storage.set("sandboxId", sandbox.id);
          if (sandbox.state !== "started") await sandbox.start();
        },
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
        dependsOn: [...(task.dependsOn ?? []), "create-sandbox"],
      })),
      {
        id: "start-dev-server",
        title: "Start development server",
        dependsOn: [
          "create-sandbox",
          ...options.config.tasks.install.map((task) => task.id),
        ],
        type: "function",
        function: async () => {
          const [sandboxId, devServer] = await Promise.all([
            this.storage.get("sandboxId"),
            this.storage.get("devServer", null),
          ]);
          const [sandbox, isDevServerRunning] = await Promise.all([
            this.daytona.get(sandboxId),
            devServer && this.isDevServerRunning(sandboxId, devServer),
          ]);

          if (!sandboxId || !isDevServerRunning) {
            const devServer = await this.startCommand(
              sandbox,
              {
                command: options.config.tasks.dev.command,
                args: options.config.tasks.dev.args ?? [],
              },
              undefined
            );

            await this.storage.set("devServer", devServer);
          }

          while (true) {
            const preview = await sandbox.getPreviewLink(options.config.port);
            const response = await fetch(preview.url, { method: "GET" });
            if (response.ok) {
              const text = await response.text();
              if (text.length) break;
            }
            logger.debug("Waiting for dev server", { url: preview.url });
            await setTimeout(200);
          }
        },
      },
    ]);
  }

  async *execute(
    request: Sandbox.Exec.Request,
    abortSignal: AbortSignal | undefined
  ): AsyncGenerator<Sandbox.Exec.Event.Any> {
    if (abortSignal?.aborted) return;

    const now = () => new Date().toISOString();
    const gen = await toAsyncIterator<[Sandbox.Exec.Event.Any]>(async (add) => {
      try {
        const sandboxId = await this.storage.get("sandboxId");
        const sandbox = await this.daytona.get(sandboxId);

        const exec = await this.startCommand(sandbox, request, abortSignal);
        add({ type: "start", timestamp: now() });

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
        const full = await sandbox.process.getSessionCommandLogs(
          exec.sessionId,
          exec.commandId
        );
        const unstreamed = {
          stdout: (full.stdout ?? "").slice(streamed.stdout.length),
          stderr: (full.stderr ?? "").slice(streamed.stderr.length),
        };
        if (unstreamed.stdout) {
          logger.debug("Unstreamed stdout", {
            length: unstreamed.stdout.length,
            data: unstreamed.stdout.slice(0, 512),
          });
          add({ type: "stdout", data: unstreamed.stdout, timestamp: now() });
        }
        if (unstreamed.stderr) {
          logger.debug("Unstreamed stderr", {
            length: unstreamed.stderr.length,
            data: unstreamed.stderr.slice(0, 512),
          });
          add({ type: "stderr", data: unstreamed.stderr, timestamp: now() });
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
        logger.error("Error executing command", error);
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
    sandbox: DaytonaSandbox,
    request: Sandbox.Exec.Request,
    abortSignal: AbortSignal | undefined
  ): Promise<{ sessionId: string; commandId: string }> {
    const sessionId = randomUUID();
    logger.debug("Creating exec session", { sessionId });
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

  async url(): Promise<string> {
    await this.assertStarted();
    const [options, sandboxId] = await Promise.all([
      this.getOptions(),
      this.storage.get("sandboxId"),
    ]);
    const sandbox = await this.daytona.get(sandboxId);
    const preview = await sandbox.getPreviewLink(options.config.port);
    return preview.url;
  }

  async destroy(): Promise<void> {
    const sandboxId = await this.storage.get("sandboxId");
    const sandbox = await this.daytona.get(sandboxId);
    await sandbox.delete();
  }
}
