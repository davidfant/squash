import { streamClaudeCodeAgent } from "@/agent/claudeCode/streamAgent";
import type { ChatMessage, ChatMessageData } from "@/agent/types";
import { createDatabase } from "@/database";
import type { MessageUsage } from "@/database/schema";
import * as schema from "@/database/schema";
import { loadBranchMessages } from "@/database/util/load-branch-messages";
import { langsmith } from "@/lib/ai";
import { checkoutLatestCommit } from "@/lib/checkoutLatestCommit";
import {
  gitCurrentCommit,
  gitReset,
  type FlyioExecSandboxContext,
} from "@/lib/flyio/exec";
import {
  createApp,
  createMachine,
  deleteApp,
  waitForMachineHealthy,
} from "@/lib/flyio/sandbox";
import { logger } from "@/lib/logger";
import { resolveMessageThreadHistory } from "@/lib/resolveMessageThreadHistory";
import { zUserMessagePart } from "@/routers/schemas";
import type { DurableObjectState } from "@cloudflare/workers-types";
import { zValidator } from "@hono/zod-validator";
import { createAppAuth } from "@octokit/auth-app";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type DataUIPart,
  type UIMessageStreamOptions,
} from "ai";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { Hono } from "hono";
import { logger as honoLogger } from "hono/logger";
import { requestId } from "hono/request-id";
import { traceable } from "langsmith/traceable";
import z from "zod";

const textEncoder = new TextEncoder();

const StreamRequestBodySchema = z.object({
  branchId: z.uuid(),
  userId: z.string(),
  message: z.object({
    id: z.uuid(),
    parts: z.array(zUserMessagePart),
    parentId: z.uuid(),
  }),
});

const PreviewRequestBodySchema = z.object({
  branchId: z.uuid(),
  sha: z.string().optional(),
});

const AbortRequestBodySchema = z.object({
  messageId: z.uuid().optional(),
  branchId: z.uuid(),
});

type StreamRequestBody = z.infer<typeof StreamRequestBodySchema>;
type PreviewRequestBody = z.infer<typeof PreviewRequestBodySchema>;
type AbortRequestBody = z.infer<typeof AbortRequestBodySchema>;

interface BufferedChunk {
  data: Uint8Array;
}

type RunStatus =
  | "idle"
  | "running"
  | "stopping"
  | "stopped"
  | "finished"
  | "failed";

interface ActiveRunContext {
  messageId: string;
  threadId: string;
  status: RunStatus;
  abortController: AbortController;
  buffer: BufferedChunk[];
  headers: Headers;
  listeners: Map<number, ReadableStreamDefaultController<Uint8Array>>;
  usage: MessageUsage[];
  streamPromise: Promise<void> | null;
}

interface AgentAppHandlers {
  stream(c: Context, body: StreamRequestBody): Promise<Response>;
  listen(c: Context): Promise<Response>;
  preview(
    c: Context,
    body: PreviewRequestBody
  ): Promise<{
    url: string;
    sha: string;
  }>;
  abort(c: Context, body: AbortRequestBody): Promise<Response>;
}

const createAgentApp = (handlers: AgentAppHandlers) =>
  new Hono()
    .use(requestId())
    .use(honoLogger())
    .post("/stream", zValidator("json", StreamRequestBodySchema), (c) =>
      handlers.stream(c, c.req.valid("json"))
    )
    .post("/listen", (c) => handlers.listen(c))
    .post("/preview", zValidator("json", PreviewRequestBodySchema), async (c) =>
      c.json(await handlers.preview(c, c.req.valid("json")))
    )
    .post("/abort", zValidator("json", AbortRequestBodySchema), (c) =>
      handlers.abort(c, c.req.valid("json"))
    )
    .onError(async (err, c) => {
      logger.error("Sandbox Durable Object Unhandled Error", {
        requestId: c.get("requestId"),
        route: c.req.path,
        query: c.req.query(),
        headers: Object.fromEntries(c.req.raw.headers.entries()),
        body: await c.req.text().catch(() => "Failed to read body"),
        stack: err.stack,
        name: err.name,
        cause: err.cause,
        message: err.message,
      });
      throw err;
    });

export type SandboxDurableObjectApp = ReturnType<typeof createAgentApp>;

export class SandboxDurableObject implements AgentAppHandlers {
  private readonly app: SandboxDurableObjectApp;
  private run: ActiveRunContext | null = null;
  private startingRun: Promise<void> | null = null;

  constructor(
    private readonly state: DurableObjectState,
    private readonly env: CloudflareBindings
  ) {
    this.app = createAgentApp(this);
  }

  async fetch(request: Request): Promise<Response> {
    return this.app.fetch(request, this.env);
  }

  public async stream(c: Context, body: StreamRequestBody): Promise<Response> {
    const sandbox = await this.state.blockConcurrencyWhile(async () => {
      if (!this.shouldStartNewRun(body)) return;
      return this.getOrCreateSandbox(body.branchId);
    });

    if (sandbox) {
      this.startingRun = this.startRun(body, sandbox).finally(() => {
        this.startingRun = null;
      });
      try {
        await this.startingRun;
      } catch (error) {
        logger.error("Failed to start run", {
          branchId: body.branchId,
          messageId: body.message.id,
          error,
        });
        throw error;
      }
    }
    if (!this.run) return c.text("No stream to listen to", 409);
    return this.listen(c);
  }

  public async listen(c: Context): Promise<Response> {
    if (!this.run) {
      const requestId = c.get("requestId");
      if (this.startingRun) {
        logger.info("Listener waiting for run to start", { requestId });
        try {
          await this.startingRun;
        } catch (error) {
          logger.error("Run failed to start while listener waiting", {
            requestId,
            error,
          });
          return c.text("Run failed to start", 409);
        }
        if (!this.run) {
          logger.debug("No run after waiting for start", { requestId });
          return c.text("", 200);
        }
      } else {
        logger.debug("Listener connected with no active run", { requestId });
        return c.text("", 200);
      }
    }

    const stream = this.createReadableStream(this.run);
    const headers = new Headers(this.run.headers);
    headers.set("cache-control", "no-cache");
    return new Response(stream, { status: 200, headers });
  }

  public async preview(
    c: Context,
    body: PreviewRequestBody
  ): Promise<{ url: string; sha: string }> {
    const sandbox = await this.state.blockConcurrencyWhile(() =>
      this.getOrCreateSandbox(body.branchId)
    );

    await waitForMachineHealthy({
      appId: sandbox.appId,
      machineId: sandbox.machineId,
      accessToken: this.env.FLY_ACCESS_TOKEN,
      abortSignal: c.req.raw.signal,
    });

    const context = { ...sandbox, accessToken: this.env.FLY_ACCESS_TOKEN };
    const url = this.previewUrl(sandbox);

    if (body.sha) {
      await gitReset(context, body.sha);
      return { url, sha: body.sha };
    } else {
      const sha = await gitCurrentCommit(context);
      return { url, sha };
    }
  }

  private previewUrl(sandbox: schema.RepoBranchSandbox): string {
    const url = new URL(this.env.PREVIEW_PROXY_URL);
    url.host = `${sandbox.appId}.${url.host}`;
    return url.toString();
    // return `https://${sandbox.appId}.fly.dev`;
  }

  public async abort(
    c: Context,
    { messageId }: AbortRequestBody
  ): Promise<Response> {
    if (!this.run || (!!messageId && this.run.messageId !== messageId)) {
      return c.json({ status: "idle" }, 202);
    }

    if (this.run.status === "running") {
      this.run.status = "stopping";
      this.run.abortController.abort(
        new DOMException("client-stop", "AbortError")
      );
      this.broadcastPart(this.run, {
        type: "data-AbortRequest",
        data: { messageId: this.run.messageId, reason: "client-stop" },
      });
    }
    return c.json({ status: this.run.status });
  }

  private shouldStartNewRun(body: StreamRequestBody): boolean {
    if (!this.run) {
      logger.debug("Starting new run because no run is active", {
        branchId: body.branchId,
        messageId: body.message.id,
      });
      return true;
    }
    if (this.run.messageId === body.message.id) {
      logger.debug("Skipping new run because message id is the same", {
        branchId: body.branchId,
        messageId: body.message.id,
        runMessageId: this.run.messageId,
      });
      return false;
    }
    if (this.run.status === "running" || this.run.status === "stopping") {
      logger.warn("Received new run request while previous run active", {
        branchId: body.branchId,
      });
      this.run.abortController.abort(
        new DOMException("superseded", "AbortError")
      );
    }
    this.disposeRun();
    return true;
  }

  private async startRun(
    body: StreamRequestBody,
    sandbox: schema.RepoBranchSandbox
  ): Promise<void> {
    const abortController = new AbortController();
    const usage: MessageUsage[] = [];
    const db = createDatabase(this.env);

    const allMessages = await loadBranchMessages(
      db,
      body.branchId,
      body.userId
    );
    if (!allMessages.length) {
      logger.debug("No messages found in branch", { branchId: body.branchId });
      return;
    }

    const threadId = allMessages[0]!.threadId;
    logger.info("Found messages in thread", {
      threadId,
      count: allMessages.length,
    });

    const messages = await (async () => {
      if (allMessages.some((m) => m.id === body.message.id)) {
        return resolveMessageThreadHistory(allMessages, body.message.id);
      } else {
        const { id, parts, parentId } = body.message;
        const [message] = await db
          .insert(schema.message)
          .values({
            id,
            role: "user",
            parts,
            threadId,
            parentId,
            createdBy: body.userId,
          })
          .returning();
        return [
          ...resolveMessageThreadHistory(allMessages, parentId),
          { ...message!, parentId },
        ];
      }
    })();
    logger.debug("Resolved messages", {
      branchId: body.branchId,
      threadId,
      messageCount: messages.length,
    });
    const nextParentId = messages.slice(-1)[0]!.id;
    const context: FlyioExecSandboxContext = {
      appId: sandbox.appId,
      machineId: sandbox.machineId,
      workdir: sandbox.workdir,
      accessToken: this.env.FLY_ACCESS_TOKEN,
    };

    const messageMetadata: UIMessageStreamOptions<ChatMessage>["messageMetadata"] =
      (opts) => {
        if (opts.part.type === "start") {
          const createdAt = new Date().toISOString();
          return { createdAt, parentId: nextParentId };
        }
        if (opts.part.type === "finish-step") {
          usage.push({
            ...opts.part.usage,
            modelId: opts.part.response.modelId,
          });
        }
        return undefined;
      };

    await traceable(
      (body: StreamRequestBody, messages: ChatMessage[]) => {
        const stream = createUIMessageStream<ChatMessage>({
          originalMessages: messages, // just needed for id generation
          generateId: randomUUID,
          onFinish: async ({ responseMessage }) => {
            logger.debug("Finished streaming response message", {
              threadId,
              responseMessageId: responseMessage.id,
              partsCount: responseMessage.parts.length,
              usageCount: usage.length,
            });
            await db.insert(schema.message).values({
              id: responseMessage.id,
              role: responseMessage.role as "user" | "assistant",
              parts: responseMessage.parts,
              usage,
              threadId,
              parentId: nextParentId,
            });
          },
          execute: async ({ writer }) => {
            writer.write({
              type: "start",
              messageMetadata: messageMetadata({ part: { type: "start" } }),
            });

            await waitForMachineHealthy({
              appId: sandbox.appId,
              machineId: sandbox.machineId,
              accessToken: this.env.FLY_ACCESS_TOKEN,
              abortSignal: abortController.signal,
              onCheck: (status, checks) =>
                writer.write({
                  type: "data-Sandbox",
                  data: {
                    status: (() => {
                      if (status === "started") return "running";
                      if (status === "starting") return "starting";
                      return "pending";
                    })(),
                    checks: checks.map((c) => ({
                      name: c.name,
                      ok: c.status === "passing",
                    })),
                  },
                }),
            });

            await checkoutLatestCommit(messages, context, db);
            await streamClaudeCodeAgent(writer, messages, context, {
              env: this.env,
              threadId,
              previewUrl: this.previewUrl(sandbox),
              abortSignal: abortController.signal,
              messageMetadata,
              onScreenshot: (imageUrl) =>
                db
                  .update(schema.repoBranch)
                  .set({ imageUrl, updatedAt: new Date() })
                  .where(eq(schema.repoBranch.id, body.branchId)),
            });
            writer.write({ type: "finish" });
          },
        });

        const response = createUIMessageStreamResponse({ stream });
        const headers = new Headers(response.headers);
        const reader = response.body?.getReader();
        if (!reader) throw new Error("Agent response missing body reader");

        this.run = {
          messageId: body.message.id,
          threadId,
          status: "running",
          abortController,
          buffer: [],
          listeners: new Map(),
          headers,
          usage,
          streamPromise: null,
        };
        this.run.streamPromise = this.consumeAgentStream(this.run, reader);
      },
      {
        name: "Code Gen Agent",
        client: langsmith,
        metadata: { userId: body.userId, session_id: threadId },
      }
    )(body, messages);
  }

  private async getOrCreateSandbox(
    branchId: string
  ): Promise<schema.RepoBranchSandbox> {
    const db = createDatabase(this.env);
    const sandbox = await db
      .select({ sandbox: schema.repoBranch.sandbox })
      .from(schema.repoBranch)
      .where(eq(schema.repoBranch.id, branchId))
      .then(([branch]) => branch?.sandbox);

    if (sandbox) {
      logger.debug("Reusing existing sandbox", { branchId });
      return sandbox;
    }

    const newSandbox = await this.createSandbox(branchId);
    await db
      .update(schema.repoBranch)
      .set({ sandbox: newSandbox })
      .where(eq(schema.repoBranch.id, branchId));
    logger.debug("Created new sandbox", { branchId });
    return newSandbox;
  }

  private async createSandbox(
    branchId: string
  ): Promise<schema.RepoBranchSandbox> {
    const appId = `sandbox-${branchId.split("-")[0]}`;
    const db = createDatabase(this.env);
    try {
      const repo = await db
        .select({
          url: schema.repo.url,
          snapshot: schema.repo.snapshot,
          branchName: schema.repoBranch.name,
          defaultBranchName: schema.repo.defaultBranch,
          provider: {
            type: schema.repoProvider.type,
            data: schema.repoProvider.data,
          },
        })
        .from(schema.repo)
        .innerJoin(
          schema.repoBranch,
          eq(schema.repo.id, schema.repoBranch.repoId)
        )
        .leftJoin(
          schema.repoProvider,
          eq(schema.repo.providerId, schema.repoProvider.id)
        )
        .where(eq(schema.repoBranch.id, branchId))
        .then(([repo]) => repo!);

      await createApp(appId, this.env.FLY_ACCESS_TOKEN, this.env.FLY_ORG_SLUG);
      logger.debug("Created new Fly.io app", { appId });

      const machine = await createMachine({
        appId,
        git: {
          url: repo.url,
          defaultBranch: repo.defaultBranchName,
          branch: repo.branchName,
          workdir: repo.snapshot.workdir,
        },
        snapshot: repo.snapshot,
        auth: {
          github:
            repo.provider?.type === "github"
              ? {
                  username: "x-access-token",
                  password: await createAppAuth({
                    appId: this.env.GITHUB_APP_ID,
                    privateKey: this.env.GITHUB_APP_PRIVATE_KEY,
                    installationId: repo.provider.data.installationId,
                  })({ type: "installation", installationId: "" }).then(
                    (auth) => auth.token
                  ),
                }
              : undefined,
          aws: !repo.provider
            ? {
                accessKeyId: this.env.R2_REPOS_ACCESS_KEY_ID,
                secretAccessKey: this.env.R2_REPOS_SECRET_ACCESS_KEY,
                endpointUrl: this.env.R2_REPOS_ENDPOINT_URL_S3,
                region: "auto",
              }
            : undefined,
        },
        accessToken: this.env.FLY_ACCESS_TOKEN,
      });
      logger.debug("Created new Fly.io machine", {
        appId,
        machineId: machine.id,
      });

      return {
        type: "flyio",
        appId,
        machineId: machine.id,
        workdir: repo.snapshot.workdir,
      };
    } catch (error) {
      await deleteApp(appId, this.env.FLY_ACCESS_TOKEN).catch(() => {});
      logger.error("Failed to create Fly.io app or machine, deleting app", {
        appId,
        error,
      });
      throw error;
    }
  }

  private async consumeAgentStream(
    run: ActiveRunContext,
    reader: ReadableStreamDefaultReader<Uint8Array>
  ): Promise<void> {
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) this.broadcastChunk(run, value);
      }
      this.finishRun(run, "finished");
    } catch (error) {
      if (run.status === "stopping") {
        this.finishRun(run, "stopped");
        return;
      }
      if (error instanceof DOMException && error.name === "AbortError") {
        run.status = "stopping";
        this.finishRun(run, "stopped");
        return;
      }
      logger.error("Agent stream failed", { threadId: run.threadId, error });
      this.finishRun(run, "failed");
    } finally {
      await langsmith.awaitPendingTraceBatches();
      reader.releaseLock();
    }
  }

  private createReadableStream(
    run: ActiveRunContext
  ): ReadableStream<Uint8Array> {
    const listenerId = Math.random();
    return new ReadableStream<Uint8Array>({
      start: (controller) => {
        run.listeners.set(listenerId, controller);
        for (const chunk of run.buffer) {
          controller.enqueue(chunk.data.slice());
        }
        if (run.status === "finished" || run.status === "failed") {
          controller.close();
          run.listeners.delete(listenerId);
        }
      },
      cancel: () => {
        run.listeners.delete(listenerId);
      },
    });
  }

  private broadcastPart(
    run: ActiveRunContext,
    part: DataUIPart<ChatMessageData>
  ) {
    try {
      const encoded = textEncoder.encode(`data: ${JSON.stringify(part)}\n\n`);
      this.broadcastChunk(run, encoded);
    } catch (error) {
      logger.warn("Failed to encode JSON chunk", { error });
    }
  }

  private broadcastChunk(run: ActiveRunContext, chunk: Uint8Array) {
    const copy = chunk.slice();
    run.buffer.push({ data: copy });
    for (const controller of run.listeners.values()) {
      try {
        controller.enqueue(copy);
      } catch (error) {
        logger.warn("Failed to enqueue chunk to listener", { error });
      }
    }
  }

  private finishRun(run: ActiveRunContext, status: RunStatus) {
    if (this.run !== run) return;
    run.status = status;

    logger.debug("Finishing run", {
      messageId: run.messageId,
      threadId: run.threadId,
      status,
      listenerCount: run.listeners.size,
    });
    for (const [listenerId, controller] of run.listeners.entries()) {
      run.listeners.delete(listenerId);
      try {
        controller.close();
      } catch (error) {
        logger.warn("Failed to close listener", { error });
      }
    }
  }

  private disposeRun() {
    if (!this.run) return;
    try {
      logger.debug("Disposing run", {
        messageId: this.run.messageId,
        threadId: this.run.threadId,
        status: this.run.status,
        usageCount: this.run.usage.length,
      });
      this.run.abortController.abort(new DOMException("dispose", "AbortError"));
      logger.debug("Disposed run", {
        messageId: this.run.messageId,
        threadId: this.run.threadId,
        status: this.run.status,
        usageCount: this.run.usage.length,
      });
    } catch {}
    this.run = null;
  }
}
