import type { AnyProxyEvent } from "@squashai/flyio-ssh-proxy";
import { createParser } from "eventsource-parser";
import { logger } from "../logger";
import { toAsyncIterator } from "../toAsyncIterator";

/**
 * Connects to your SSH-over-WS proxy and returns an async generator
 * that yields each stdout line as it arrives.
 *
 * @param url  The websocket URL, e.g. "wss://yourhost:PORT/"
 * @param jwt  The signed FlyioSSHProxyJWTPayload token
 */
export async function* streamSSH(opts: {
  url: string;
  token: string;
  env: Record<string, string>;
  command: string;
  abortSignal: AbortSignal;
}): AsyncIterableIterator<[AnyProxyEvent]> {
  logger.debug("Connecting to SSH proxy", { url: opts.url });

  const res = await fetch(opts.url, {
    method: "POST",
    // duplex: "half",
    headers: {
      Accept: "text/event-stream",
      "Accept-Encoding": "identity",
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.token}`,
    },
    body: JSON.stringify({ command: opts.command, env: opts.env }),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const done = new AbortController();
  yield* toAsyncIterator<[AnyProxyEvent]>(
    (handler) => {
      const parser = createParser({
        onEvent: (event) => {
          const data = JSON.parse(event.data) as AnyProxyEvent;
          logger.debug("Received SSH proxy message", { data });
          handler(data);
        },
        onError: (error) =>
          logger.error("Error parsing SSH proxy message", { error }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      opts.abortSignal.addEventListener("abort", () => {
        logger.debug("SSH proxy aborted", { url: opts.url });
        reader?.cancel();
        done.abort();
      });

      (async () => {
        while (reader && !done.signal.aborted) {
          const res = await reader.read();
          if (res.value) {
            const chunk = decoder.decode(res.value, { stream: true });
            parser.feed(chunk);
          }

          if (res.done) break;
        }
      })().finally(() => done.abort());

      return () => {};
    },
    { signal: done.signal }
  );
}
