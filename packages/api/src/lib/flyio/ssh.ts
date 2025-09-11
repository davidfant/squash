import type {
  FlyioSSHProxyMessage,
  FlyioSSHProxyProxyRequest,
} from "@squash/flyio-ssh-proxy";

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

  const deferred = <T>() => {
    let r!: (v: T) => void;
    const p = new Promise<T>((res) => (r = res));
    return { promise: p, resolve: r };
  };

  // Buffer of pending stdout messages
  const queue: FlyioSSHProxyMessage[] = [];
  const next = deferred<void>();
  const done = deferred<void>();

  ws.addEventListener("open", () => {
    ws.send(JSON.stringify({ jwt } satisfies FlyioSSHProxyProxyRequest));
  });

  ws.addEventListener("message", (event) => {
    try {
      const msg: FlyioSSHProxyMessage = JSON.parse(event.data);
      queue.push(msg);
      next.resolve();
      if (msg.type === "exit" || msg.type === "error") {
        done.resolve();
        ws.close();
      }
    } catch (error) {
      console.warn("Failed to parse message", error, event.data.toString());
    }
  });

  const closeOrError = () => {
    done.resolve();
    next.resolve();
  };
  ws.addEventListener("close", closeOrError);
  ws.addEventListener("error", closeOrError);

  try {
    while (true) {
      // yield everything we already have
      while (queue.length) {
        const msg = queue.shift()!;
        yield msg;
        if (msg.type === "exit" || msg.type === "error") return;
      }

      // wait for either a new message OR the stream ending
      await Promise.race([next.promise, done.promise]);

      // re-arm the 'next' deferred for the next iteration
      if (queue.length === 0 && done.promise === Promise.resolve()) break;
      next.promise = new Promise<void>((res) => (next.resolve = res));
    }
  } finally {
    ws.close();
  }

  await done;
}
