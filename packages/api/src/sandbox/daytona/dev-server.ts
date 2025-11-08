import { logger } from "@/lib/logger";
import type { Sandbox as DaytonaSandbox } from "@daytonaio/sdk";
import { randomUUID } from "crypto";
import { setTimeout } from "timers/promises";
import type { Sandbox } from "../types";
import { startCommand } from "./util";

export class DaytonaDevServer {
  private logEncoder = new TextEncoder();
  private logListeners = new Map<
    string,
    ReadableStreamDefaultController<Uint8Array>
  >();

  constructor(
    private readonly sandbox: DaytonaSandbox,
    readonly sessionId: string,
    readonly commandId: string
  ) {
    this.sandbox.process
      .getSessionCommandLogs(
        this.sessionId,
        this.commandId,
        (data) => this.onLog(data),
        (data) => this.onLog(data)
      )
      .then(() => this.closeLogListeners());
  }

  async isRunning(): Promise<boolean> {
    try {
      const cmd = await this.sandbox.process.getSessionCommand(
        this.sessionId,
        this.commandId
      );
      return cmd.exitCode === undefined;
    } catch {
      return false;
    }
  }

  async waitUntilReachable(port: number) {
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        const preview = await this.sandbox.getPreviewLink(port);
        logger.debug("Fetching preview", { url: preview.url, attempt });
        const response = await fetch(preview.url, { method: "GET" });
        if (response.ok) {
          const text = await response.text();
          if (text.length) return;
        }
        logger.debug("Waiting for dev server", { url: preview.url });
      } catch (error) {
        logger.error("Error getting preview link", {
          name: (error as Error).name,
          message: (error as Error).message,
          stack: (error as Error).stack,
        });
      }

      await setTimeout(200);
    }

    throw new Error("Dev server not reachable");
  }

  static async start(
    sandbox: DaytonaSandbox,
    task: Sandbox.Snapshot.Task.Command
  ) {
    const { sessionId, commandId } = await startCommand(sandbox, {
      command: task.command,
      args: task.args ?? [],
    });
    return new DaytonaDevServer(sandbox, sessionId, commandId);
  }

  private async onLog(chunk: string) {
    const lines = chunk.replace(/\r/g, "").split("\n");
    if (!lines.length) return;
    const payload = lines.map((line) => `data: ${line}`).join("\n");
    const encoded = this.logEncoder.encode(`${payload}\n\n`);
    for (const l of this.logListeners.values()) l.enqueue(encoded);
  }

  private closeLogListeners() {
    for (const l of this.logListeners.values()) l.close();
    this.logListeners.clear();
  }

  listenToLogs() {
    const listenerId = randomUUID();
    const stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        this.logListeners.set(listenerId, controller);
      },
      cancel: () => {
        this.logListeners.delete(listenerId);
      },
    });
    return stream;
  }
}
