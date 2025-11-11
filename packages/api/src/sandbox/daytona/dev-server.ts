import { logger } from "@/lib/logger";
import type { Sandbox as DaytonaSandbox } from "@daytonaio/sdk";
import { randomUUID } from "crypto";
import { setTimeout } from "timers/promises";
import type { Sandbox } from "../types";
import { startCommand } from "./util";

export class DaytonaDevServer {
  constructor(
    private readonly sandbox: DaytonaSandbox,
    readonly sessionId: string,
    readonly commandId: string
  ) {}

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
    logger.debug("Starting dev server", { sandboxId: sandbox.id });
    const { sessionId, commandId } = await startCommand(sandbox, {
      command: task.command,
      args: task.args ?? [],
    });
    logger.debug("Started dev server", {
      sandboxId: sandbox.id,
      sessionId,
      commandId,
    });
    return new DaytonaDevServer(sandbox, sessionId, commandId);
  }

  async listenToLogs() {
    const encoder = new TextEncoder();
    const result = await this.sandbox.process.getSessionCommandLogs(
      this.sessionId,
      this.commandId
    );
    const skip = {
      // Note(fant): seems like Daytona result stdout is +1 longer than the sum of all the chunks
      stdout: result.stdout?.length ?? 0,
      stderr: result.stderr?.length ?? 0,
    };

    const listenerId = randomUUID();
    logger.debug("Start listening to logs", {
      sandboxId: this.sandbox.id,
      listenerId,
    });
    const stream = new ReadableStream<Uint8Array>({
      start: async (controller) => {
        const log = (data: string) => {
          const lines = data.replace(/\r/g, "").split("\n");
          if (lines.length) {
            const payload = lines.map((line) => `data: ${line}`).join("\n");
            const encoded = encoder.encode(`${payload}\n\n`);
            controller.enqueue(encoded);
          }
        };

        await this.sandbox.process.getSessionCommandLogs(
          this.sessionId,
          this.commandId,
          (data) => {
            skip.stdout -= data.length;
            if (skip.stdout < 0) log(data);
          },
          (data) => {
            skip.stderr -= data.length;
            if (skip.stderr < 0) log(data);
          }
        );

        controller.close();
      },
      cancel: () => {
        logger.debug("Cancel listening to logs", {
          sandboxId: this.sandbox.id,
          listenerId,
        });
      },
    });

    return stream;
  }
}
