import type { SquashIframeBridgeCommand } from "./types";

// ------------------------
// Type helpers
// ------------------------

export type Command<T extends SquashIframeBridgeCommand.Any["command"]> =
  Extract<SquashIframeBridgeCommand.Any, { command: T }>;

// ------------------------
// Core bridge class
// ------------------------

export interface SquashIframeBridgeOptions {
  /** Origin check when receiving messages. Default = "*" (disabled) */
  origin?: string;
  /** Default timeout (ms) for `request()` calls. Default = 10 000 ms */
  timeout?: number;
  debug?: boolean;
}

export class SquashIframeBridge {
  private readonly listeners = new Map<
    string,
    Set<(payload: SquashIframeBridgeCommand.Any) => void>
  >();

  readonly id = crypto.randomUUID().slice(0, 8);

  constructor(
    private readonly targetWindow: Window,
    private readonly options: SquashIframeBridgeOptions = {}
  ) {
    if (this.options.debug) {
      console.log(`[SquashIframeBridge#${this.id}]`, "constructor");
    }
    window.addEventListener("message", this.handleMessage);
  }

  /** Dispose the bridge and clear all pending requests */
  dispose() {
    if (this.options.debug) {
      console.log(`[SquashIframeBridge#${this.id}]`, "dispose");
    }
    window.removeEventListener("message", this.handleMessage);
    this.listeners.clear();
  }

  // ------------------------
  // Request / response
  // ------------------------

  async request<
    Req extends SquashIframeBridgeCommand.Any,
    Res extends SquashIframeBridgeCommand.Any
  >(
    command: Omit<Req, "id">,
    opt: { timeout?: number; signal?: AbortSignal } = {}
  ): Promise<Res> {
    const id = crypto.randomUUID();
    const msg = { ...command, id } as Req;

    const { timeout = this.options.timeout ?? 10_000, signal } = opt;

    return new Promise<Res>((resolve, reject) => {
      let timer: number | undefined;

      const unsub = this.on(msg.command, (payload) => {
        if (payload.id === id) {
          resolve(payload as Res);
          unsub();
          if (timer) clearTimeout(timer);
        }
      });

      if (timeout !== 0) {
        timer = window.setTimeout(() => {
          reject(
            new Error(`Request '${msg.command}' timed out after ${timeout} ms`)
          );
          unsub();
        }, timeout);
      }

      const onAbort = () => {
        if (timer) clearTimeout(timer);
        unsub();
        reject(new DOMException("Aborted", "AbortError"));
      };

      if (signal) {
        if (signal.aborted) return onAbort();
        signal.addEventListener("abort", onAbort, { once: true });
      }

      this.post(msg);
    });
  }

  // ------------------------
  // Events
  // ------------------------

  /** Listen to one‑way events (e.g. `navigate`) */
  on<T extends SquashIframeBridgeCommand.Any["command"]>(
    command: T,
    handler: (payload: Command<T>) => void
  ) {
    if (this.options.debug) {
      console.log(`[SquashIframeBridge#${this.id}]`, "on", command);
    }

    let set = this.listeners.get(command);
    if (!set) {
      set = new Set();
      this.listeners.set(command, set);
    }
    set.add(handler as any);
    return () => {
      if (this.options.debug) {
        console.log(
          `[SquashIframeBridge#${this.id}]`,
          "on",
          command,
          "unsubscribe"
        );
      }
      set!.delete(handler as any);
    }; // unsubscribe helper
  }

  post(msg: SquashIframeBridgeCommand.Any) {
    if (this.options.debug) {
      console.log(`[SquashIframeBridge#${this.id}]`, "post", msg);
    }

    this.targetWindow.postMessage(msg, this.options.origin ?? "*");
  }

  // ------------------------
  // Internals
  // ------------------------

  private handleMessage = (ev: MessageEvent) => {
    const { data, origin, source } = ev;
    if (source !== this.targetWindow) {
      return;
    }

    if (
      this.options.origin &&
      this.options.origin !== "*" &&
      origin !== this.options.origin
    ) {
      return; // wrong origin
    }

    if (
      data &&
      typeof data === "object" &&
      data.source === "@squashai/iframe-bridge"
    ) {
      if (this.options.debug) {
        console.log(
          `[SquashIframeBridge#${this.id}]`,
          "handleMessage",
          data,
          this.listeners,
          this.id
        );
      }
      const cmd = data as SquashIframeBridgeCommand.Any;
      this.listeners.get(cmd.command)?.forEach((fn) => fn(cmd));
    }
  };
}
