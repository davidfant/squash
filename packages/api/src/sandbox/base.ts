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
  executeTasks,
  raceWithAbortSignal,
  runCommand,
  storage,
  storeInitialCommitInSystemMessage,
  type Storage,
} from "./util";

interface Handle {
  type: string;
  buffer: Uint8Array[];
  listeners: Map<string, ReadableStreamDefaultController<Uint8Array>>;
  done: Promise<unknown> | null;
  controller: AbortController;
}

function createReadableStream(handle: Handle) {
  const listenerId = randomUUID();
  return new ReadableStream<Uint8Array>({
    start: (controller) => {
      handle.listeners.set(listenerId, controller);
      for (const part of handle.buffer) {
        controller.enqueue(part);
      }
    },
    cancel: () => {
      handle.listeners.delete(listenerId);
    },
  });
}

export abstract class BaseSandboxManagerDurableObject<
    C extends Sandbox.Snapshot.Config.Any,
    S extends Record<string, unknown>
  >
  extends DurableObject
  implements Sandbox.Manager.Base<C>
{
  abstract name: string;

  protected storage: Storage<S>;
  private handles: {
    start: Handle | null;
    agent: Handle | null;
  } = { start: null, agent: null };
  private encoder = new TextEncoder();

  constructor(
    protected readonly state: DurableObjectState,
    env: CloudflareBindings
  ) {
    super(state, env);
    this.storage = storage<any>(state.storage);
  }

  abstract isStarted(): Promise<boolean>;
  abstract getPreviewUrl(): Promise<string>;
  abstract execute(
    request: Sandbox.Exec.Request,
    abortSignal: AbortSignal | undefined
  ): AsyncGenerator<Sandbox.Exec.Event.Any>;
  abstract destroy(): Promise<void>;
  abstract getStartTasks(): Promise<Sandbox.Snapshot.Task.Any[]>;
  abstract restoreVersion(messages: ChatMessage[]): Promise<void>;

  async init(options: Sandbox.Options<C>): Promise<void> {
    await this.state.storage.put("options", options);
  }

  protected async getOptions(): Promise<Sandbox.Options<C>> {
    const options = await this.state.storage.get<Sandbox.Options<C>>("options");
    if (!options) throw new Error("Sandbox manager not initialized");
    return options;
  }

  async start(): Promise<void> {
    await this.state.blockConcurrencyWhile(async () => {
      if (!this.handles.start && !(await this.isStarted())) {
        const tasks = await this.getStartTasks();
        const controller = new AbortController();

        const start: Handle = {
          type: "start",
          controller,
          buffer: [],
          listeners: new Map(),
          done: Promise.resolve(executeTasks(tasks, this))
            .then((s) => (s ? this.consumeStream(s, start) : undefined))
            .finally(() => (this.handles.start = null)),
        };
        this.handles.start = start;
      }
    });
  }

  async waitUntilStarted(): Promise<void> {
    await this.start();
    await this.handles.start?.done;
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
            `git commit --quiet ${[title, body]
              .filter((v) => !!v.trim())
              .map((v) => `-m ${escape([v])}`)
              .join(" ")}`,
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
    await this.waitUntilStarted();
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
    await this.waitUntilStarted();
    logger.info("Getting current git commit");
    const stream = await this.execute(
      { command: "git", args: ["rev-parse", "HEAD"] },
      abortSignal
    );

    const { stdout } = await runCommand(stream);
    return stdout.trim();
  }

  async isAgentRunning(): Promise<boolean> {
    return !!this.handles.agent;
  }

  async startAgent(req: {
    messages: ChatMessage[];
    threadId: string;
    branchId: string;
  }) {
    await this.state.blockConcurrencyWhile(async () => {
      if (!this.handles.agent) {
        logger.debug("Starting new agent run because no run is active");
      } else {
        logger.debug("Stopping existing agent run because new run started");
        this.handles.agent.controller.abort(
          new DOMException("superseded", "AbortError")
        );
        this.handles.agent = null;
      }

      const controller = new AbortController();
      const agent: Handle = {
        type: "agent",
        controller,
        buffer: [],
        listeners: new Map(),
        done: this.createAgentStream(req, controller)
          .then((s) => (s ? this.consumeStream(s, agent) : undefined))
          .finally(() => (this.handles.agent = null)),
      };
      this.handles.agent = agent;
    });
  }

  listenToAgent(): Response {
    if (!this.handles.agent) {
      logger.debug("No agent handle to listen to");
      return new Response(null, { status: 204 });
    }
    return this.listen(this.handles.agent);
  }

  listenToStart(): Response {
    if (!this.handles.start) {
      logger.debug("No start handle to listen to");
      return new Response(null, { status: 204 });
    }
    return this.listen(this.handles.start);
  }

  private listen = (handle: Handle) =>
    new Response(createReadableStream(handle), {
      status: 200,
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
      },
    });

  private async createAgentStream(
    req: {
      messages: ChatMessage[];
      threadId: string;
      branchId: string;
    },
    controller: AbortController
  ) {
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

    return createUIMessageStream<ChatMessage>({
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

        const agentSession = req.messages
          .flatMap((m) => m.parts)
          .findLast((p) => p.type === "data-AgentSession");

        await raceWithAbortSignal(this.waitUntilStarted(), controller.signal);
        await raceWithAbortSignal(
          storeInitialCommitInSystemMessage(req.messages, this, db),
          controller.signal
        );
        await streamClaudeCodeAgent(writer, req.messages, this, {
          env: this.env,
          threadId: req.threadId,
          agentSessionId: agentSession?.data.id,
          previewUrl: await this.getPreviewUrl(),
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
  }

  stopAgent() {
    if (!this.handles.agent) return;

    logger.info("Stopping agent");
    this.handles.agent.controller.abort(
      new DOMException("user-abort", "AbortError")
    );
    this.broadcast(
      { type: "data-AbortRequest", data: { reason: "client-stop" } },
      this.handles.agent
    );

    this.handles.agent = null;
  }

  private async consumeStream(
    stream: ReadableStream<InferUIMessageChunk<ChatMessage>>,
    handle: Handle
  ): Promise<void> {
    const reader = stream.getReader();
    try {
      while (handle.controller.signal.aborted !== true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) this.broadcast(value, handle);
      }
      logger.debug("Consumed stream", { type: handle.type });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      logger.error("Stream failed", { type: handle.type, error });
    } finally {
      for (const listener of handle.listeners.values() ?? []) {
        try {
          listener.close();
        } catch (error) {
          logger.warn("Failed to close listener", { type: handle.type, error });
        }
      }
      reader.releaseLock();
      logger.debug("Closed listeners and reader", { type: handle.type });
    }
  }

  private broadcast(part: InferUIMessageChunk<ChatMessage>, handle: Handle) {
    logger.debug("Broadcasting chunk", {
      type: handle.type,
      part: JSON.stringify(part).slice(0, 512),
    });
    const encoded = this.encoder.encode(`data: ${JSON.stringify(part)}\n\n`);
    handle.buffer.push(encoded);

    for (const l of handle.listeners.values()) l.enqueue(encoded);
  }
}
