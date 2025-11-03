import { streamAgent } from "@/agent/stream";
import type { ChatMessage } from "@/agent/types";
import { createDatabase } from "@/database";
import * as schema from "@/database/schema";
import { logger } from "@/lib/logger";
import { type InferUIMessageChunk } from "ai";
import { DurableObject, env } from "cloudflare:workers";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import type { Buffer } from "node:buffer";
import escape from "shell-escape";
import type { Sandbox } from "./types";
import { executeTasks, runCommand, storage, type Storage } from "./util";

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
    fork: Handle;
  } = {
    start: emptyHandle("start"),
    agent: emptyHandle("agent"),
    deploy: emptyHandle("deploy"),
    fork: emptyHandle("fork"),
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
  abstract getForkTasks(
    options?: Sandbox.ForkOptions
  ): Promise<Sandbox.Snapshot.Task.Any[]>;
  abstract restoreVersion(messages: ChatMessage[]): Promise<void>;
  protected abstract readClaudeCodeSessionData(
    sessionId: string
  ): Promise<string>;
  abstract readFile(path: string): Promise<Buffer>;
  abstract keepAlive(): Promise<void>;
  abstract readEnvFile(): Promise<Record<string, string | null>>;
  abstract writeEnvFile(env: Record<string, string | null>): Promise<void>;

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
          this.consumeStream(s, deploy)
        ),
      };

      this.handles.deploy = deploy;
    });
  }

  async fork(options?: Sandbox.ForkOptions): Promise<void> {
    await this.waitUntilStarted();
    await this.state.blockConcurrencyWhile(async () => {
      if (this.handles.fork.active) return;

      const tasks = await this.getForkTasks(options);
      const controller = new AbortController();
      const fork: Handle = {
        type: "fork",
        controller,
        buffer: [],
        active: true,
        listeners: new Map(),
        promise: Promise.resolve(executeTasks(tasks, this)).then((s) =>
          this.consumeStream(s, fork)
        ),
      };

      this.handles.fork = fork;
    });
  }

  async gitCommit(
    title: string,
    body: string,
    abortSignal: AbortSignal | undefined
  ): Promise<string> {
    const options = await this.getOptions();

    const db = createDatabase(env);
    const repo = await db
      .select()
      .from(schema.repo)
      .where(eq(schema.repo.id, options.branch.repoId))
      .then(([repo]) => repo);
    if (!repo) throw new Error(`Repo not found: ${options.branch.repoId}`);

    logger.info("Git commit and push", {
      title,
      body,
      gitUrl: repo.gitUrl,
      ...options,
    });
    const stream = await this.execute(
      {
        command: "sh",
        args: [
          "-c",
          `
          set -e;

          git add -A;
          git config --global user.name 'Squash';
          git config --global user.email 'agent@squash.build';
          git commit --quiet ${[title, body]
            .filter((v) => !!v.trim())
            .map((v) => `-m ${escape([v])}`)
            .join(" ")};

          if git remote get-url origin > /dev/null 2>&1; then
            git remote set-url origin ${repo.gitUrl}
          else
            git remote add origin ${repo.gitUrl}
          fi

          git push --force --set-upstream origin HEAD:${options.branch.name};

          echo '<sha>';
          git rev-parse HEAD;
          echo '</sha>';
          `,
        ],
        env: {
          AWS_ENDPOINT_URL_S3: env.R2_REPOS_ENDPOINT_URL_S3,
          AWS_ACCESS_KEY_ID: env.R2_REPOS_ACCESS_KEY_ID,
          AWS_SECRET_ACCESS_KEY: env.R2_REPOS_SECRET_ACCESS_KEY,
          AWS_DEFAULT_REGION: "auto",
        },
      },
      abortSignal
    );

    const { stdout } = await runCommand(stream);
    const sha = stdout.trim().split("<sha>")[1]?.split("</sha>")[0]?.trim();
    if (!sha) throw new Error("Git commit failed");
    return sha;
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

  async listFiles(): Promise<string[]> {
    await this.waitUntilStarted();
    const options = await this.getOptions();

    logger.info("Listing repository files");
    const stream = await this.execute(
      {
        command: "git",
        args: ["ls-files", "--cached", "--others", "--exclude-standard"],
        cwd: options.config.cwd,
      },
      undefined
    );
    const { stdout } = await runCommand(stream);

    return stdout
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => !!line)
      .sort((a, b) => a.localeCompare(b));
  }

  async isAgentRunning(): Promise<boolean> {
    return this.handles.agent.active;
  }

  async startAgent(req: {
    messages: ChatMessage[];
    threadId: string;
    branchId: string;
    restoreVersion: boolean;
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
        promise: Promise.resolve(
          streamAgent({
            ...req,
            controller,
            sandbox: this,
            readSessionData: (id) => this.readClaudeCodeSessionData(id),
          })
        ).then((s) => this.consumeStream(s, agent)),
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
  listenToFork(): Response {
    return this.listen("fork");
  }
  abstract listenToLogs(): Promise<Response>;

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

  async stopAgent() {
    if (!this.handles.agent.active) {
      logger.debug("Agent is not active, skipping stop");
      return;
    }

    const waitForStream = this.handles.agent.promise.catch((error) => {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      throw error;
    });

    logger.info("Stopping agent");
    this.handles.agent.controller.abort(
      new DOMException("user-abort", "AbortError")
    );
    this.broadcast(
      { type: "data-AbortRequest", data: { reason: "client-stop" } },
      this.handles.agent
    );

    this.handles.agent.active = false;
    await waitForStream;
  }

  private async consumeStream(
    stream: ReadableStream<InferUIMessageChunk<ChatMessage>>,
    handle: Handle
  ): Promise<void> {
    const reader = stream.getReader();
    try {
      // while (handle.controller.signal.aborted !== true) {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) this.broadcast(value, handle);
      }
      logger.debug("Consumed stream", { type: handle.type });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      logger.error("Stream failed", {
        type: handle.type,
        error: (error as Error).message,
        stack: (error as Error).stack,
        name: (error as Error).name,
        cause: (error as Error).cause,
      });
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
