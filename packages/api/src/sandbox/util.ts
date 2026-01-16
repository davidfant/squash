import type { ChatMessage, SandboxTaskToolInput } from "@/agent/types";
import { createDatabase } from "@/database";
import * as schema from "@/database/schema";
import { logger } from "@/lib/logger";
import type { InferUIMessageChunk } from "ai";
import { env } from "cloudflare:workers";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import type { Sandbox } from "./types";

export async function runCommand(
  gen: AsyncGenerator<Sandbox.Exec.Event.Any>
): Promise<{ stdout: string; stderr: string }> {
  let stdout = "";
  let stderr = "";
  for await (const ev of gen) {
    if (ev.type === "stdout") {
      logger.debug("Command stdout", ev.data.slice(0, 512));
      stdout += ev.data;
    }
    if (ev.type === "stderr") {
      logger.debug("Command stderr", ev.data);
      stderr += ev.data;
    }
    if (ev.type === "complete") return { stdout, stderr };
    if (ev.type === "error") throw new Error(ev.error);
  }

  logger.error("Command ended without error or complete", {
    stdout: stdout.slice(0, 512),
    stderr: stderr.slice(0, 512),
  });
  throw new Error("Command ended without error or complete");
}

export interface Storage<T extends Record<string, unknown>> {
  get: <K extends keyof T & string, D = T[K]>(
    key: K,
    defaultValue?: D
  ) => Promise<T[K] | D>;
  set: <K extends keyof T & string>(key: K, value: T[K]) => void;
}

export const storage = <T extends Record<string, unknown>>(
  storage: DurableObjectStorage
) => ({
  get: async (key: keyof T & string, defaultValue?: T[typeof key]) => {
    const value = await storage.get<T[typeof key]>(key);
    if (!value) return defaultValue;
    return value;
  },
  set: (key: keyof T & string, value: T[typeof key]) => storage.put(key, value),
});

const isAsyncGenerator = <T>(obj: any): obj is AsyncGenerator<T> =>
  obj != null &&
  typeof obj[Symbol.asyncIterator] === "function" &&
  typeof obj.next === "function" &&
  typeof obj.throw === "function" &&
  typeof obj.return === "function";

export const executeTasks = (
  tasks: Sandbox.Snapshot.Task.Any[],
  sandbox: Sandbox.Manager.Base
) =>
  new ReadableStream<InferUIMessageChunk<ChatMessage>>({
    start: async (c) => {
      const completed = new Set<string>();
      const failed = new Set<string>();
      const running = new Map<string, Promise<void>>();

      const canExecute = (t: Sandbox.Snapshot.Task.Any): boolean =>
        !completed.has(t.id) &&
        !failed.has(t.id) &&
        !running.has(t.id) &&
        (t.dependsOn ?? []).every((d: string) => completed.has(d));

      const executeTask = async (
        task: Sandbox.Snapshot.Task.Any
      ): Promise<void> => {
        const toolCallId = randomUUID();
        logger.debug("Executing task", { taskId: task.id, toolCallId });
        c.enqueue({
          type: "tool-input-start",
          toolCallId,
          toolName: "SandboxTask",
        });
        c.enqueue({
          type: "tool-input-delta",
          toolCallId,
          inputTextDelta: `{"id":"${task.id}","title":"${task.title}","stream":[`,
        });

        const input: SandboxTaskToolInput = {
          id: task.id,
          title: task.title,
          events: [],
        };

        const controllerEnqueueInputAvailable = () => {
          c.enqueue({
            type: "tool-input-delta",
            toolCallId,
            inputTextDelta: `]}`,
          });
          c.enqueue({
            type: "tool-input-available",
            toolCallId,
            toolName: "SandboxTask",
            input,
          });
        };

        try {
          const stream =
            (async function* (): AsyncGenerator<Sandbox.Exec.Event.Any> {
              if (task.type === "command") {
                yield* sandbox.execute(
                  { command: task.command, args: task.args, env: task.env },
                  undefined
                );
              } else if (task.type === "function") {
                const res = task.function();
                yield { type: "start", timestamp: new Date().toISOString() };
                if (isAsyncGenerator(res)) {
                  yield* res;
                } else {
                  const events = await res;
                  yield* events;
                }
                yield {
                  type: "complete",
                  timestamp: new Date().toISOString(),
                };
              }
            })();

          for await (const e of stream) {
            const d = (!!input.events.length ? "," : "") + JSON.stringify(e);
            c.enqueue({
              type: "tool-input-delta",
              toolCallId,
              inputTextDelta: d,
            });
            input.events.push(e);

            if (e.type === "error") throw new Error(e.error);
          }

          completed.add(task.id);
          logger.debug("Task completed", { taskId: task.id });

          controllerEnqueueInputAvailable();
          c.enqueue({
            type: "tool-output-available",
            toolCallId,
            output: { summary: undefined },
          });
        } catch (error) {
          controllerEnqueueInputAvailable();

          const errorText =
            error instanceof Error ? error.message : String(error);
          c.enqueue({ type: "tool-output-error", toolCallId, errorText });
          failed.add(task.id);
          logger.error("Task failed", {
            taskId: task.id,
            input,
            error: {
              stack: (error as Error).stack,
              name: (error as Error).name,
              cause: (error as Error).cause,
              message: (error as Error).message,
            },
          });
        } finally {
          running.delete(task.id);
        }
      };

      c.enqueue({ type: "start", messageId: randomUUID() });

      const enqueue = () =>
        tasks
          .filter(canExecute)
          .forEach((task) => running.set(task.id, executeTask(task)));

      enqueue();
      while (!!running.size) {
        await Promise.race(Array.from(running.values()));
        enqueue();
      }

      if (!!failed.size) {
        const errorText = `Tasks failed: ${[...failed]
          .map((id) => tasks.find((task) => task.id === id)!)
          .map((t) => `'${t.title}'`)
          .join(", ")}`;
        c.enqueue({ type: "finish" });
        // c.enqueue({ type: "error", errorText });

        await new Promise((r) => setTimeout(r, 0));
        c.error(new Error(errorText));
      } else if (completed.size !== tasks.length) {
        const errorText = `Tasks not started: ${tasks
          .filter((task) => !completed.has(task.id))
          .map((t) => `'${t.title}'`)
          .join(", ")}`;
        c.enqueue({ type: "error", errorText });
        await new Promise((r) => setTimeout(r, 0));
        c.error(new Error(errorText));
      } else {
        c.enqueue({ type: "finish" });
        // TODO: this causes "Uncaught Error: Network connection lost"
        c.close();
      }
    },
  });

const pullLatestChangesScript = (opts: {
  gitUrl: string;
  defaultBranch: string;
  targetBranch: string;
}) =>
  `
    set -e

    # ------------------------------------------------------------------------------
    # CONFIG
    # ------------------------------------------------------------------------------
    remote_url="${opts.gitUrl}"
    target_branch="${opts.targetBranch}"
    default_branch="${opts.defaultBranch}"

    # ------------------------------------------------------------------------------
    # 1. If we are *not* already inside a Git repo, initialise & “clone in-place”
    #    (keeps any pre-existing, git-ignored files such as node_modules/)
    # ------------------------------------------------------------------------------
    if [ ! -d .git ]; then
      git init                                   # create empty repo in current dir
      git remote add origin "$remote_url"

      git fetch --prune origin                   # grab all refs
      git checkout -B "$default_branch" "origin/$default_branch"  # sync default

      # fork out the desired working branch if it isn’t the default
      if [ "$target_branch" != "$default_branch" ]; then
        git checkout -b "$target_branch"
      fi
      exit 0                                     # done – nothing more to do
    fi

    # ------------------------------------------------------------------------------
    # 2. Repo already exists – make sure the remote is correct, then fetch
    # ------------------------------------------------------------------------------
    if git remote get-url origin >/dev/null 2>&1; then
      git remote set-url origin "$remote_url"
    else
      git remote add origin "$remote_url"
    fi

    git fetch --prune origin

    # ------------------------------------------------------------------------------
    # 3. Decide whether we need to switch branches
    #    – If already on $target_branch → nothing to do
    #    – Else, follow the priority rules:
    #         a) local branch exists  → checkout it
    #         b) remote branch exists → checkout & track it
    #         c) otherwise            → checkout default, then create new branch
    # ------------------------------------------------------------------------------
    current_branch="$(git symbolic-ref --quiet --short HEAD || true)"

    if [ "$current_branch" = "$target_branch" ]; then
      # Already where we need to be – finished
      exit 0
    fi

    if git rev-parse --verify "$target_branch" >/dev/null 2>&1; then
      git checkout "$target_branch"

    elif git ls-remote --exit-code origin "$target_branch" >/dev/null 2>&1; then
      git checkout -B "$target_branch" "origin/$target_branch"

    else
      # Switch to default first (creating it locally if needed) …
      if ! git rev-parse --verify "$default_branch" >/dev/null 2>&1; then
        git checkout -B "$default_branch" "origin/$default_branch"
      else
        git checkout "$default_branch"
      fi
      # … then fork out the new working branch
      git checkout -b "$target_branch"
    fi
  `.trim();

export async function* pullLatestChanges(
  branch: {
    name: string;
    repoId: string;
  },
  sandbox: Sandbox.Manager.Base
): AsyncGenerator<Sandbox.Exec.Event.Any> {
  const db = createDatabase(env);
  const repo = await db
    .select()
    .from(schema.repo)
    .where(eq(schema.repo.id, branch.repoId))
    .then(([repo]) => repo);
  if (!repo) {
    throw new Error(`Repo not found: ${branch.repoId}`);
  }

  logger.info("Pulling latest changes", branch);
  yield* sandbox.execute(
    {
      command: "sh",
      args: [
        "-c",
        pullLatestChangesScript({
          gitUrl: repo.gitUrl,
          defaultBranch: repo.defaultBranch,
          targetBranch: branch.name,
        }),
      ],
      // TODO: generate creds that can only access the specific repo if it's in the R2 bucket
      env: {
        AWS_ENDPOINT_URL_S3: env.R2_REPOS_ENDPOINT_URL_S3,
        AWS_ACCESS_KEY_ID: env.R2_REPOS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: env.R2_REPOS_SECRET_ACCESS_KEY,
        AWS_DEFAULT_REGION: "auto",
      },
    },
    undefined
  );
}
