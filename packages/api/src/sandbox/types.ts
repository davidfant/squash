import type { ChatMessage } from "@/agent/types";

export namespace Sandbox {
  export namespace Snapshot {
    export namespace Task {
      export interface Base {
        id: string;
        title: string;
        dependsOn?: string[];
      }

      export interface Command extends Base {
        type: "command";
        command: string;
        args?: string[];
      }

      export interface Function extends Base {
        type: "function";
        function: () =>
          | Promise<Exec.Event.Any[]>
          | AsyncGenerator<Exec.Event.Any>;
      }

      export type Any = Command | Function;
    }

    export namespace Config {
      export interface Base {
        port: number;
        cwd: string;
        env: Record<string, string>;
        tasks: {
          install: Task.Any[];
          dev: Task.Command;
          build: Task.Any[];
        };
      }

      export interface Docker extends Base {
        type: "docker";
        image: string;
      }

      export interface Cloudflare extends Base {
        type: "cloudflare";
      }

      export interface Vercel extends Base {
        type: "vercel";
      }

      export interface Daytona extends Base {
        type: "daytona";
        snapshot: string;
      }

      export type Any = Docker | Cloudflare | Vercel | Daytona;
    }
  }

  export namespace Exec {
    export namespace Event {
      export interface Start {
        type: "start";
        timestamp: string;
      }
      export interface Stdout {
        type: "stdout";
        data: string;
        timestamp: string;
      }
      export interface Stderr {
        type: "stderr";
        data: string;
        timestamp: string;
      }
      export interface Complete {
        type: "complete";
        timestamp: string;
      }
      export interface Error {
        type: "error";
        error: string;
        timestamp: string;
      }
      export type Any = Start | Stdout | Stderr | Complete | Error;
    }

    export interface Request {
      command: string;
      args?: string[];
      env?: Record<string, string>;
      cwd?: string;
    }
  }

  export interface Options<
    C extends Snapshot.Config.Any = Snapshot.Config.Any
  > {
    config: C;
    repo: { id: string; branch: string };
  }

  export namespace Manager {
    export interface Base<C extends Snapshot.Config.Any = Snapshot.Config.Any> {
      name: string;

      init(opts: Options<C>): Promise<void>;
      isStarted(): Promise<boolean>;
      start(): Promise<void>;
      waitUntilStarted(): Promise<void>;
      getPreviewUrl(): Promise<string>;
      execute(
        request: Exec.Request,
        abortSignal?: AbortSignal
      ): AsyncGenerator<Exec.Event.Any>;
      gitPush(abortSignal?: AbortSignal): Promise<void>;
      gitCommit(
        title: string,
        body: string,
        abortSignal?: AbortSignal
      ): Promise<string>;
      gitReset(sha: string, abortSignal?: AbortSignal): Promise<void>;
      gitCurrentCommit(abortSignal?: AbortSignal): Promise<string>;
      destroy(): Promise<void>;

      isAgentRunning(): Promise<boolean>;
      startAgent(req: {
        messages: ChatMessage[];
        threadId: string;
        branchId: string;
      }): Promise<void>;
      listenToAgent(): Response;
      listenToStart(): Response;
      stopAgent(): Promise<void>;
    }
  }

  export interface Run {
    messageId: string;
    abortController: AbortController;
    buffer: Uint8Array[];
    headers: Headers;
    listeners: Map<number, ReadableStreamDefaultController<Uint8Array>>;
  }
}
