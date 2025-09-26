import { logger } from "@/lib/logger";
import { env } from "cloudflare:workers";
import jsonlines from "jsonlines";
import z from "zod";

const LogLine = z.object({
  stream: z.enum(["stdout", "stderr"]),
  data: z.string(),
});

interface SandboxAndRoutesResponse {
  sandbox: {
    id: string;
    status: "pending" | "running" | "stopping" | "stopped" | "failed";
  };
  routes: Array<{ url: string; subdomain: string; port: number }>;
}

const request = (
  path: string,
  opts: { method?: "GET" | "POST"; body?: any; signal?: AbortSignal } = {}
) =>
  fetch(`https://api.vercel.com${path}`, {
    method: opts.method,
    headers: {
      Authorization: `Bearer ${env.VERCEL_API_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(opts.body),
    signal: opts.signal,
  });

// throw error if not ok
async function parseResponse<T>(promise: Promise<Response>): Promise<T> {
  const res = await promise;
  if (!res.ok) {
    throw new Error(
      `Request ${res.url} failed with status ${res.status} ${
        res.statusText
      }: ${await res.text().catch(() => "")}`
    );
  }
  return res.json<T>();
}

export const createSandbox = (params: {
  ports: number[];
  source: {
    type: "git";
    url: string;
    depth?: number;
    revision?: string;
    username?: string;
    password?: string;
  };
  projectId: string;
  timeout?: number;
  resources?: { vcpus: number };
  runtime?: "node22";
}) =>
  parseResponse<SandboxAndRoutesResponse>(
    request("/v1/sandboxes", {
      method: "POST",
      body: params,
    })
  );

export const getSandbox = (sandboxId: string) =>
  parseResponse<SandboxAndRoutesResponse>(
    request(`/v1/sandboxes/${sandboxId}`)
  );

export const stopSandbox = (sandboxId: string) =>
  parseResponse<{ sandbox: { id: string } }>(
    request(`/v1/sandboxes/${sandboxId}/stop`, {
      method: "POST",
    })
  );

export const runCommand = (
  sandboxId: string,
  body: {
    cwd?: string;
    command: string;
    args: string[];
    env: Record<string, string>;
    sudo: boolean;
  }
) =>
  parseResponse<{ command: { id: string } }>(
    request(`/v1/sandboxes/${sandboxId}/cmd`, {
      method: "POST",
      body: body,
    })
  );

export const getCommand = (sandboxId: string, commandId: string) =>
  parseResponse<{ command: { id: string; exitCode: number | null } }>(
    request(`/v1/sandboxes/${sandboxId}/cmd/${commandId}`)
  );

export const waitForCommand = (sandboxId: string, commandId: string) =>
  parseResponse<{ command: { id: string; exitCode: number } }>(
    request(`/v1/sandboxes/${sandboxId}/cmd/${commandId}?wait=true`)
  );

export async function* streamCommandLogs({
  sandboxId,
  commandId,
  signal,
}: {
  sandboxId: string;
  commandId: string;
  signal?: AbortSignal;
}): AsyncGenerator<{ stream: "stdout" | "stderr"; data: string }> {
  const response = await request(
    `/v1/sandboxes/${sandboxId}/cmd/${commandId}/logs`,
    { signal }
  );

  if (response.headers.get("content-type") !== "application/x-ndjson") {
    throw new Error("Expected a stream of logs");
  }

  if (response.body === null) {
    throw new Error("No response body");
  }

  const stream = jsonlines.parse();
  pipe(response.body, stream).catch((err) => {
    logger.error("Error piping logs:", err);
  });

  for await (const chunk of stream) {
    yield LogLine.parse(chunk);
  }
}

async function pipe(
  readable: ReadableStream<Uint8Array>,
  output: NodeJS.WritableStream
) {
  const reader = readable.getReader();
  try {
    while (true) {
      const read = await reader.read();
      if (read.value) {
        output.write(Buffer.from(read.value));
      }
      if (read.done) {
        break;
      }
    }
  } catch (err) {
    output.emit("error", err);
  } finally {
    output.end();
  }
}
