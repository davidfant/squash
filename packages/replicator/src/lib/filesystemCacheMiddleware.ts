import { simulateReadableStream, wrapLanguageModel } from "ai";
import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

type LanguageModelV2Middleware = Parameters<
  typeof wrapLanguageModel
>[0]["middleware"];

type CacheMode = "generate" | "stream";

interface FSCacheOptions {
  /** Defaults to ~/.cache/replicator */
  baseDir?: string;
  /** Optional TTL in seconds. If omitted, cache never expires. */
  ttlSeconds?: number;
}

function stableKey(params: unknown) {
  // You can tune which fields matter (e.g., omit providerMetadata if desired)
  const raw = JSON.stringify(params);
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function cachePath(opts: FSCacheOptions, mode: CacheMode, key: string) {
  const base = opts.baseDir ?? path.join(os.homedir(), ".cache", "replicator");
  return path.join(base, mode, `${key}.json`);
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    const data = await fs.readFile(file, "utf8");
    return JSON.parse(data) as T;
  } catch (e: any) {
    if (e?.code === "ENOENT") return null;
    throw e;
  }
}

async function writeJson(file: string, data: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data), "utf8");
}

async function isExpired(file: string, ttlSeconds?: number) {
  if (!ttlSeconds) return false;
  try {
    const stat = await fs.stat(file);
    const ageSec = (Date.now() - stat.mtimeMs) / 1000;
    return ageSec > ttlSeconds;
  } catch (e: any) {
    if (e?.code === "ENOENT") return true;
    throw e;
  }
}

/**
 * Filesystem cache middleware for AI SDK v5 Language Models.
 * Caches generateText/generateObject via wrapGenerate,
 * and streamText/streamObject via wrapStream.
 */
export function filesystemCacheMiddleware(
  options: FSCacheOptions = {}
): LanguageModelV2Middleware {
  return {
    wrapGenerate: async ({ doGenerate, params }) => {
      const key = stableKey(params);
      const file = cachePath(options, "generate", key);

      if (!(await isExpired(file, options.ttlSeconds))) {
        const cached: any = await readJson(file);
        if (cached) {
          // Rehydrate timestamps if present
          if (cached?.response?.timestamp) {
            cached.response.timestamp = new Date(cached.response.timestamp);
          }
          return cached;
        }
      }

      const result = await doGenerate();
      // Serialize Date to ISO
      const serializable = {
        ...result,
        response: {
          ...result.response,
          timestamp: result.response?.timestamp?.toISOString?.() ?? null,
        },
      };
      await writeJson(file, serializable);
      return result;
    },

    wrapStream: async ({ doStream, params }) => {
      const key = stableKey(params);
      const file = cachePath(options, "stream", key);

      if (!(await isExpired(file, options.ttlSeconds))) {
        const cached: any = await readJson(file);
        if (cached) {
          // Rehydrate any Date-like fields
          const parts = cached.map((p: any) =>
            p.type === "response-metadata" && p.timestamp
              ? { ...p, timestamp: new Date(p.timestamp) }
              : p
          );
          return {
            stream: simulateReadableStream({
              initialDelayInMs: 0,
              chunkDelayInMs: 10,
              chunks: parts,
            }),
          };
        }
      }

      const { stream, ...rest } = await doStream();
      const full: any[] = [];

      const transform = new TransformStream({
        transform(chunk, controller) {
          full.push(
            chunk.type === "response-metadata" && (chunk as any).timestamp
              ? { ...chunk, timestamp: chunk.timestamp.toISOString?.() ?? null }
              : chunk
          );
          controller.enqueue(chunk);
        },
        async flush() {
          await writeJson(file, full);
        },
      });

      return { stream: stream.pipeThrough(transform), ...rest };
    },
  };
}
