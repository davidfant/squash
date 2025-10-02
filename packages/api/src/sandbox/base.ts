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
  promise: Promise<unknown>;
  active: boolean;
  controller: AbortController;
}

const emptyHandle = (type: string): Handle => ({
  type,
  buffer: [],
  listeners: new Map(),
  promise: Promise.resolve(),
  active: false,
  controller: new AbortController(),
});

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
    start: Handle;
    agent: Handle;
    deploy: Handle;
  } = {
    start: emptyHandle("start"),
    agent: emptyHandle("agent"),
    deploy: emptyHandle("deploy"),
  };
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
  abstract getDeployTasks(): Promise<Sandbox.Snapshot.Task.Any[]>;
  abstract restoreVersion(messages: ChatMessage[]): Promise<void>;
  protected abstract readClaudeCodeSessionData(
    sessionId: string
  ): Promise<string>;

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
      if (!this.handles.start.active && !(await this.isStarted())) {
        const tasks = await this.getStartTasks();
        const controller = new AbortController();

        const start: Handle = {
          type: "start",
          controller,
          buffer: [],
          active: true,
          listeners: new Map(),
          promise: Promise.resolve(executeTasks(tasks, this)).then((s) =>
            this.consumeStream(s, start)
          ),
        };
        this.handles.start = start;
      }
    });
  }

  async waitUntilStarted(): Promise<void> {
    await this.start();
    await this.handles.start.promise;
  }

  async deploy(): Promise<void> {
    await this.waitUntilStarted();

    await this.state.blockConcurrencyWhile(async () => {
      if (this.handles.deploy.active) return;

      const tasks = await this.getDeployTasks();
      const controller = new AbortController();
      const deploy: Handle = {
        type: "deploy",
        controller,
        buffer: [],
        active: true,
        listeners: new Map(),
        promise: Promise.resolve(executeTasks(tasks, this)).then((s) =>
          this.consumeStream(executeTasks(tasks, this), deploy)
        ),
      };

      this.handles.deploy = deploy;

      //   const domains = await db
      //   .select()
      //   .from(schema.repoBranchDomain)
      //   .where(eq(schema.repoBranchDomain.branchId, params.branchId));
      // if (!domains.length) {
      //   await db.insert(schema.repoBranchDomain).values({
      //     branchId: params.branchId,
      //     url: `https://${params.branchId}.hypershape.app`,
      //   });
      // }
    });
  }

  async gitPush(abortSignal: AbortSignal | undefined): Promise<void> {
    const options = await this.getOptions();

    const db = createDatabase(env);
    const repo = await db
      .select()
      .from(schema.repo)
      .where(eq(schema.repo.id, options.branch.repoId))
      .then(([repo]) => repo);
    if (!repo) throw new Error(`Repo not found: ${options.branch.repoId}`);

    logger.info("Pushing git", options.branch);
    await this.execute(
      {
        command: "sh",
        args: [
          "-c",
          [
            `git remote set-url origin ${repo.url}`,
            `git push origin ${options.branch.name}`,
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
    return this.handles.agent.active;
  }

  async startAgent(req: {
    messages: ChatMessage[];
    threadId: string;
    branchId: string;
  }) {
    await this.state.blockConcurrencyWhile(async () => {
      if (this.handles.agent.active) {
        logger.debug("Stopping existing agent run because new run started");
        this.handles.agent.controller.abort(
          new DOMException("superseded", "AbortError")
        );
        this.handles.agent.active = false;
      } else {
        logger.debug("Starting new agent run because no run is active");
      }

      const controller = new AbortController();
      const agent: Handle = {
        type: "agent",
        controller,
        buffer: [],
        active: true,
        listeners: new Map(),
        promise: this.createAgentStream(req, controller).then((s) =>
          s ? this.consumeStream(s, agent) : undefined
        ),
      };
      this.handles.agent = agent;
    });
  }

  listenToAgent(): Response {
    return this.listen("agent");
  }
  listenToStart(): Response {
    return this.listen("start");
  }
  listenToDeploy(): Response {
    return this.listen("deploy");
  }

  private listen(type: keyof typeof this.handles & string) {
    const handle = this.handles[type];
    if (!handle.active) {
      logger.debug(`No active ${type} handle to listen to`);
      return new Response(null, { status: 204 });
    }
    return new Response(createReadableStream(handle), {
      status: 200,
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
      },
    });
  }

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
          sessionId: agentSession?.data.id,
          previewUrl: await this.getPreviewUrl(),
          abortSignal: controller.signal,
          messageMetadata,
          readSessionData: (id) => this.readClaudeCodeSessionData(id),
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
    if (!this.handles.agent.active) {
      logger.debug("Agent is not active, skipping stop");
      return;
    }

    logger.info("Stopping agent");
    this.handles.agent.controller.abort(
      new DOMException("user-abort", "AbortError")
    );
    this.broadcast(
      { type: "data-AbortRequest", data: { reason: "client-stop" } },
      this.handles.agent
    );

    this.handles.agent.active = false;
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
      throw error;
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
      handle.active = false;
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
