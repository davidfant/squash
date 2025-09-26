import { serve } from "@hono/node-server";
import { zValidator } from "@hono/zod-validator";
import { ChildProcess, spawn } from "child_process";
import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { logger as honoLogger } from "hono/logger";
import { requestId } from "hono/request-id";
import { streamSSE } from "hono/streaming";
import escape from "shell-escape";
import z from "zod";
import { jwtPayloadSchema, type Event } from "./types.js";

function terminate(child: ChildProcess) {
  if (!child.killed) {
    child.kill("SIGTERM");
    setTimeout(() => !child.killed && child.kill("SIGKILL"), 5_000);
  }
}

async function ping(appId: string) {
  const url = `https://${appId}.fly.dev`;
  try {
    const response = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(10000),
    });
    console.log({
      message: "Fly.io app ping successful",
      data: { app: appId, status: response.status, url },
    });
  } catch (error) {
    console.warn({
      message: "Fly.io app ping failed",
      data: {
        app: appId,
        error: error instanceof Error ? error.message : String(error),
        url,
      },
    });
  }
}

const app = new Hono()
  .use(requestId())
  .use(honoLogger())
  .get("/", (c) => c.text("ok"))
  .use("/ssh", jwt({ secret: process.env.JWT_PUBLIC_KEY!, alg: "RS256" }))
  .post(
    "/ssh",
    zValidator(
      "json",
      z.object({ command: z.string(), env: z.record(z.string(), z.string()) })
    ),
    (c) => {
      c.header("Content-Type", "text/event-stream; charset=utf-8");
      c.header("Cache-Control", "no-cache, no-transform");
      c.header("Connection", "keep-alive");
      c.header("X-Accel-Buffering", "no");
      c.header("Content-Encoding", "identity");
      return streamSSE(c, (stream) => {
        return new Promise<void>(async (resolve) => {
          {
            const body = await c.req.valid("json");
            const payload = jwtPayloadSchema.parse(c.get("jwtPayload"));

            console.log({
              message: "Starting Fly.io SSH session",
              data: { app: payload.app, env: Object.keys(body.env) },
            });

            const child = spawn(
              "flyctl",
              [
                "ssh",
                "console",
                "--app",
                payload.app,
                "--command",
                `sh -c ${escape([body.command])}`,
              ],
              { env: { ...process.env, ...body.env } }
            );

            // const pingInterval = setInterval(() => ping(payload.app), 60000);
            // ping(payload.app);

            const write = (ev: Event.Any) =>
              stream.writeSSE({ data: JSON.stringify(ev) });

            child.on("spawn", () => {
              write({ type: "start", timestamp: new Date().toISOString() });
              console.log({
                message: "flyctl process spawned",
                data: { app: payload.app },
              });
            });

            c.req.raw.signal.addEventListener("abort", () => terminate(child));

            child.stdout.on("data", (buf) => {
              console.debug({
                message: "flyctl process stdout",
                data: {
                  app: payload.app,
                  data: buf.toString("utf8").slice(0, 512),
                },
              });
              write({
                type: "stdout",
                data: buf.toString("utf8"),
                timestamp: new Date().toISOString(),
              });
            });
            child.stderr.on("data", (buf) => {
              console.debug({
                message: "flyctl process stderr",
                data: { app: payload.app, data: buf.toString("utf8") },
              });
              write({
                type: "stderr",
                data: buf.toString("utf8"),
                timestamp: new Date().toISOString(),
              });
            });
            child.on("error", (err) => {
              console.error({
                message: "flyctl process error",
                data: { app: payload.app, message: err.message },
              });
              write({
                type: "error",
                error: err.message,
                timestamp: new Date().toISOString(),
              });
            });
            child.on("close", (code) => {
              console.log({
                message: "flyctl process closed",
                data: { app: payload.app, code },
              });
            });
            child.on("exit", async (code) => {
              console.log({
                message: "flyctl process exited",
                data: { app: payload.app, code },
              });

              // clearInterval(pingInterval);
              console.log({
                message: "Fly.io app ping interval cleared",
                data: { app: payload.app },
              });

              if (code === 0) {
                await write({
                  type: "complete",
                  timestamp: new Date().toISOString(),
                });
              } else {
                await write({
                  type: "error",
                  error: `Process exited with code ${code}`,
                  timestamp: new Date().toISOString(),
                });
              }
              await stream.close();
              resolve();
            });
          }
        }).catch(async (err) => {
          console.error({
            message: "Fly.io SSH Proxy Stream Error",
            data: {
              stack: err.stack,
              name: err.name,
              cause: err.cause,
              message: err.message,
            },
          });
          throw err;
        });
      });
    }
  )
  .onError(async (err, c) => {
    console.error(
      JSON.stringify({
        message: "Fly.io SSH Proxy Hono Error",
        data: {
          requestId: c.get("requestId"),
          route: c.req.path,
          query: c.req.query(),
          // headers: Object.fromEntries(c.req.raw.headers.entries()),
          body: await c.req.text().catch(() => "Failed to read body"),
          stack: err.stack,
          name: err.name,
          cause: err.cause,
          message: err.message,
        },
      })
    );
    throw err;
  });

export type AppType = typeof app;

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

serve(
  { fetch: app.fetch, port: Number(process.env.PORT!), hostname: "0.0.0.0" },
  (info) => console.log("Server started on port", info.port)
);
