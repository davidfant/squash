import type { AnyProxyEvent } from "@squash/flyio-ssh-proxy";
import { logger } from "../logger";

/**
 * Connects to your SSH-over-WS proxy and returns an async generator
 * that yields each stdout line as it arrives.
 *
 * @param url  The websocket URL, e.g. "wss://yourhost:PORT/"
 * @param jwt  The signed FlyioSSHProxyJWTPayload token
 */
export async function* streamSSH(
  url: string,
  jwt: string,
  abortSignal: AbortSignal
): AsyncGenerator<AnyProxyEvent, void> {
  const deferred = <T>() => {
    let r!: (v: T) => void;
    const p = new Promise<T>((res) => (r = res));
    return { promise: p, resolve: r };
  };

  const queue: AnyProxyEvent[] = [];
  const next = deferred<void>();
  const done = deferred<void>();

  logger.debug("Connecting to SSH proxy", { url });

  const es = new EventSource(`${url}?token=${jwt}`);
  es.onopen = () => logger.debug("Connected to SSH proxy", { url });
  es.onmessage = (message) => {
    const event = JSON.parse(message.data) as AnyProxyEvent;
    logger.debug("Received SSH proxy message", { data: event });
    queue.push(event);
    next.resolve();
  };

  es.onerror = (error) => {
    logger.debug("SSH proxy disconnected or errored", {
      url,
      message: (error as any).error?.message,
    });
    done.resolve();
    next.resolve();
  };

  abortSignal.addEventListener("abort", () => {
    logger.debug("SSH proxy aborted", { url });
    es.close();
    done.resolve();
    next.resolve();
  });

  while (true) {
    // yield everything we already have
    while (queue.length) {
      const event = queue.shift()!;
      yield event;
      if (event.type === "exit" || event.type === "error") return;
    }

    // wait for either a new message OR the stream ending
    await new Promise((res) => setTimeout(res, 50));
    await Promise.race([next.promise, done.promise]);

    // re-arm the 'next' deferred for the next iteration
    if (queue.length === 0 && done.promise === Promise.resolve()) break;
    next.promise = new Promise<void>((res) => (next.resolve = res));
  }

  await done;
}
