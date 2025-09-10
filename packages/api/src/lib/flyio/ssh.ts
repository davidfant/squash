import type {
  FlyioSSHProxyMessage,
  FlyioSSHProxyProxyRequest,
} from "@squash/flyio-ssh-proxy";
import WebSocket from "ws";

/**
 * Connects to your SSH-over-WS proxy and returns an async generator
 * that yields each stdout line as it arrives.
 *
 * @param url  The websocket URL, e.g. "wss://yourhost:PORT/"
 * @param jwt  The signed FlyioSSHProxyJWTPayload token
 */
export async function* streamSSH(
  url: string,
  jwt: string
): AsyncGenerator<FlyioSSHProxyMessage, void> {
  const ws = new WebSocket(url);

  // Buffer of pending stdout messages
  const queue: FlyioSSHProxyMessage[] = [];
  let resolveNext: (() => void) | null = null;

  // Promise that resolves when ws is closed or exit received
  let done: Promise<void>;
  let doneResolve!: () => void;
  done = new Promise((res) => (doneResolve = res));

  ws.on("open", () => {
    // Send our JWT request
    const req: FlyioSSHProxyProxyRequest = { jwt };
    ws.send(JSON.stringify(req));
  });

  ws.on("message", (data) => {
    try {
      const msg: FlyioSSHProxyMessage = JSON.parse(data.toString());
      queue.push(msg);
      if (resolveNext) {
        resolveNext();
        resolveNext = null;
      }

      // When process ends (exit or error), mark done
      if (msg.type === "exit" || msg.type === "error") {
        doneResolve();
      }
    } catch {
      // ignore malformed
      return;
    }
  });

  ws.on("error", doneResolve);
  ws.on("close", doneResolve);

  try {
    while (true) {
      // Yield all buffered lines
      while (queue.length) {
        yield queue.shift()!;
      }
      // Wait for next stdout or done
      await new Promise<void>((res) => {
        resolveNext = res;
        // if done fires first, resolveNext will never be called, but we unblock below
      }).catch(() => {
        /* noop */
      });
      // If socket closed before pushing any more, break
      if (ws.readyState !== WebSocket.OPEN && queue.length === 0) {
        break;
      }
    }
  } finally {
    ws.close();
  }

  // Wait for any remaining cleanup
  await done;
}
