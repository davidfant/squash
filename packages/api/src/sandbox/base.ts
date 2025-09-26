import { streamClaudeCodeAgent } from "@/agent/claudeCode/streamAgent";
import type { ChatMessage } from "@/agent/types";
import { createDatabase } from "@/database";
import * as schema from "@/database/schema";
import { logger } from "@/lib/logger";
import {
  createUIMessageStream,
  type InferUIMessageChunk,
  type UIMessageStreamOptions,
} from "ai";
import { DurableObject, env } from "cloudflare:workers";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import escape from "shell-escape";
import type { Sandbox } from "./types";
import {
  checkoutLatestCommit,
  runCommand,
  storage,
  type Storage,
} from "./util";

interface RunDetails {
  buffer: Uint8Array[];
  listeners: Map<string, ReadableStreamDefaultController<Uint8Array>>;
  stream: Promise<unknown> | null;
}

export abstract class BaseSandboxManagerDurableObject<
    C extends Sandbox.Snapshot.Config.Any,
    S extends Record<string, unknown>
  >
  extends DurableObject
  implements Sandbox.Manager.Base<C>
{
  abstract name: string;

  protected starting: Promise<void> | null = null;
  protected storage: Storage<S>;
  // protected abortController: AbortController = new AbortController();
  private run: {
    controller: AbortController;
    promise: Promise<RunDetails>;
  } | null = null;
  private encoder = new TextEncoder();

  constructor(
    protected readonly state: DurableObjectState,
    env: CloudflareBindings
  ) {
    super(state, env);
    this.storage = storage<any>(state.storage);
  }

  async init(options: Sandbox.Options<C>): Promise<void> {
    await this.state.storage.put("options", options);
  }

  protected async getOptions(): Promise<Sandbox.Options<C>> {
    const options = await this.state.storage.get<Sandbox.Options<C>>("options");
    if (!options) throw new Error("Sandbox manager not initialized");
    return options;
  }

  protected async assertStarted(): Promise<void> {
    await this.state.blockConcurrencyWhile(async () => {
      if (await this.isStarted()) return;
      if (!this.starting) this.starting = this.start();
    });
    await this.starting;
  }

  abstract start(): Promise<void>;
  abstract isStarted(): Promise<boolean>;
  abstract url(): Promise<string>;
  abstract execute(
    request: Sandbox.Exec.Request,
    abortSignal: AbortSignal | undefined
  ): AsyncGenerator<Sandbox.Exec.Event.Any>;
  abstract destroy(): Promise<void>;

  protected async performTasks(
    tasks: Sandbox.Snapshot.Task.Any[]
  ): Promise<void> {
    const completed = new Set<string>();
    const failed = new Set<string>();
    const running = new Map<string, Promise<void>>();

    const canExecute = (task: Sandbox.Snapshot.Task.Any): boolean =>
      (task.dependsOn ?? []).every((depId: string) => completed.has(depId));

    const executeTask = async (
      task: Sandbox.Snapshot.Task.Any
    ): Promise<void> => {
      logger.debug("Executing task", { taskId: task.id });
      try {
        if (task.type === "command") {
          const stream = await this.execute(
            { command: task.command, args: task.args },
            undefined
          );
          await runCommand(stream);
        } else if (task.type === "function") {
          await task.function();
        }
        completed.add(task.id);
        logger.debug("Task completed", { taskId: task.id });
      } catch (error) {
        failed.add(task.id);
        logger.error("Task failed", { taskId: task.id, error });
        throw new Error(
          `Task ${task.id} failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    };

    // Main processing loop
    while (completed.size + failed.size < tasks.length) {
      // Find tasks that can be executed (dependencies met and not already running/completed/failed)
      tasks
        .filter(
          (task) =>
            !completed.has(task.id) &&
            !failed.has(task.id) &&
            !running.has(task.id) &&
            canExecute(task)
        )
        .forEach((task) => running.set(task.id, executeTask(task)));

      // If no tasks are running and we haven't completed all tasks, we have a problem
      if (running.size === 0) {
        const remainingTasks = tasks.filter(
          (task) => !completed.has(task.id) && !failed.has(task.id)
        );

        if (!!remainingTasks.length) {
          const taskIds = remainingTasks.map((t) => t.id).join(", ");
          logger.error(
            "Cannot proceed: remaining tasks have unmet dependencies or circular dependencies",
            { taskIds, completed: [...completed], failed: [...failed] }
          );
          throw new Error(
            `Cannot proceed: remaining tasks [${taskIds}] have unmet dependencies or circular dependencies`
          );
        }
        break;
      }

      await Promise.race(Array.from(running.values())).catch(() => {});

      // Clean up completed/failed tasks from running tasks map
      const settledPromises = await Promise.allSettled(
        Array.from(running.entries()).map(async ([taskId, promise]) => {
          try {
            await promise;
            return { taskId, settled: true };
          } catch {
            return { taskId, settled: true };
          }
        })
      );

      for (const result of settledPromises) {
        if (result.status === "fulfilled" && result.value.settled) {
          running.delete(result.value.taskId);
        }
      }
    }

    // Check if all tasks completed successfully
    if (!!failed.size) {
      const failedTaskIds = Array.from(failed).join(", ");
      throw new Error(
        `Task execution failed. Failed tasks: [${failedTaskIds}]`
      );
    }

    if (completed.size !== tasks.length) {
      const incompleteTasks = tasks
        .filter((task) => !completed.has(task.id))
        .map((task) => task.id)
        .join(", ");
      throw new Error(
        `Not all tasks completed successfully. Incomplete tasks: [${incompleteTasks}]`
      );
    }
  }

  async gitPush(abortSignal: AbortSignal | undefined): Promise<void> {
    const options = await this.getOptions();

    const db = createDatabase(env);
    const repo = await db
      .select()
      .from(schema.repo)
      .where(eq(schema.repo.id, options.repo.id))
      .then(([repo]) => repo);
    if (!repo) throw new Error(`Repo not found: ${options.repo.id}`);

    logger.info("Pushing git", options.repo);
    await this.execute(
      {
        command: "sh",
        args: [
          "-c",
          [
            `git remote set-url origin ${repo.url}`,
            `git push origin ${options.repo.branch}`,
          ].join(" && "),
        ],
        cwd: options.config.cwd,
      },
      abortSignal
    );
  }

  async gitCommit(
    title: string,
    body: string,
    abortSignal: AbortSignal | undefined
  ): Promise<string> {
    logger.info("Committing git", { title, body });
    const stream = await this.execute(
      {
        command: "sh",
        args: [
          "-c",
          [
            `git add -A`,
            `git config --global user.name 'Squash'`,
            `git config --global user.email 'agent@squash.build'`,
            `git commit -m ${escape([title])} -m ${escape([body])} --quiet`,
            `git rev-parse HEAD`,
          ].join(" && "),
        ],
      },
      abortSignal
    );

    const { stdout } = await runCommand(stream);
    return stdout.trim();
  }

  async gitReset(
    sha: string,
    abortSignal: AbortSignal | undefined
  ): Promise<void> {
    await this.assertStarted();
    logger.info("Resetting git to", { sha });
    const stream = await this.execute(
      { command: "git", args: ["reset", "--hard", sha] },
      abortSignal
    );
    await runCommand(stream);
  }
  async gitCurrentCommit(
    abortSignal: AbortSignal | undefined
  ): Promise<string> {
    await this.assertStarted();
    logger.info("Getting current git commit");
    const stream = await this.execute(
      { command: "git", args: ["rev-parse", "HEAD"] },
      abortSignal
    );

    const { stdout } = await runCommand(stream);
    return stdout.trim();
  }

  async isAgentRunning(): Promise<boolean> {
    return !!this.run;
  }

  async startAgent(req: {
    messages: ChatMessage[];
    threadId: string;
    branchId: string;
  }): Promise<Response> {
    await this.state.blockConcurrencyWhile(async () => {
      if (!this.run) {
        logger.debug("Starting new agent run because no run is active");
        return;
      }

      logger.debug("Stopping existing agent run because new run started");
      this.run.controller.abort(new DOMException("superseded", "AbortError"));
      this.run = null;
    });

    const controller = new AbortController();
    this.run = {
      controller,
      promise: this.assertStarted().then(() =>
        this.createAgentRun(req, controller)
      ),
    };
    return this.listenToAgent();
  }

  async listenToAgent(): Promise<Response> {
    if (!this.run) {
      logger.debug("Cannot listen to agent because no run is active");
      return new Response(null, { status: 204 });
    }

    const run = await this.run.promise;
    const listenerId = randomUUID();
    const stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        run.listeners.set(listenerId, controller);
        for (const part of run.buffer) {
          controller.enqueue(part);
        }
      },
      cancel: () => {
        run.listeners.delete(listenerId);
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

  private async createAgentRun(
    req: {
      messages: ChatMessage[];
      threadId: string;
      branchId: string;
    },
    controller: AbortController
  ): Promise<RunDetails> {
    const run: RunDetails = { buffer: [], listeners: new Map(), stream: null };
    if (controller.signal.aborted) return run;

    const db = createDatabase(env);
    const nextParentId = req.messages.slice(-1)[0]!.id;
    logger.info("Creating agent run", {
      messages: req.messages.length,
      threadId: req.threadId,
      branchId: req.branchId,
      nextParentId,
    });

    const messageMetadata: UIMessageStreamOptions<ChatMessage>["messageMetadata"] =
      (opts) => {
        if (opts.part.type === "start") {
          const createdAt = new Date().toISOString();
          return { createdAt, parentId: nextParentId };
        }
        // if (opts.part.type === "finish-step") {
        //   usage.push({
        //     ...opts.part.usage,
        //     modelId: opts.part.response.modelId,
        //   });
        // }
        return undefined;
      };

    const stream = createUIMessageStream<ChatMessage>({
      originalMessages: req.messages, // just needed for id generation
      generateId: randomUUID,
      onFinish: async ({ responseMessage }) => {
        logger.debug("Finished streaming response message", {
          threadId: req.threadId,
          responseMessageId: responseMessage.id,
          parts: responseMessage.parts.length,
          // usageCount: usage.length,
        });
        await db.insert(schema.message).values({
          id: responseMessage.id,
          role: responseMessage.role as "user" | "assistant",
          parts: responseMessage.parts,
          // usage,
          threadId: req.threadId,
          parentId: nextParentId,
        });
      },
      execute: async ({ writer }) => {
        writer.write({
          type: "start",
          messageMetadata: messageMetadata({ part: { type: "start" } }),
        });

        await checkoutLatestCommit(req.messages, this, db);
        await streamClaudeCodeAgent(writer, req.messages, this, {
          env: this.env,
          threadId: req.threadId,
          previewUrl: await this.url(),
          abortSignal: controller.signal,
          messageMetadata,
          onScreenshot: (imageUrl) =>
            db
              .update(schema.repoBranch)
              .set({ imageUrl, updatedAt: new Date() })
              .where(eq(schema.repoBranch.id, req.branchId)),
        });
        writer.write({ type: "finish" });
      },
    });

    run.stream = this.consumeStream(run, stream, controller.signal);
    return run;
  }

  async stopAgent(): Promise<void> {
    if (!this.run) return;

    this.run.controller.abort(new DOMException("user-abort", "AbortError"));

    this.broadcast(await this.run.promise, {
      type: "data-AbortRequest",
      data: { reason: "client-stop" },
    });

    this.run = null;
  }

  private async consumeStream(
    run: RunDetails,
    stream: ReadableStream<InferUIMessageChunk<ChatMessage>>,
    abortSignal: AbortSignal | undefined
  ): Promise<void> {
    const reader = stream.getReader();
    try {
      while (abortSignal?.aborted !== true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) this.broadcast(run, value);
      }
      logger.debug("Consumed stream");
      this.run = null;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      logger.error("Agent stream failed", error);
    } finally {
      for (const listener of run.listeners.values()) {
        try {
          listener.close();
        } catch (error) {
          logger.warn("Failed to close listener", { error });
        }
      }
      reader.releaseLock();
      logger.debug("Closed listeners and reader");
    }
  }

  private broadcast(run: RunDetails, part: InferUIMessageChunk<ChatMessage>) {
    logger.debug("Broadcasting chunk", JSON.stringify(part).slice(0, 512));
    const encoded = this.encoder.encode(`data: ${JSON.stringify(part)}\n\n`);
    run.buffer.push(encoded);
    for (const listener of run.listeners.values()) {
      try {
        listener.enqueue(encoded);
      } catch (error) {
        logger.warn("Failed to enqueue chunk to listener", { error });
      }
    }
  }
}
