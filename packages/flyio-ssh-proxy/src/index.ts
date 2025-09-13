import { serve } from "@hono/node-server";
import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { streamSSE } from "hono/streaming";
import { jwtPayloadSchema, type AnyProxyEvent } from "./types.js";

const escape = (str: string) => `'${str.replace(/'/g, `'\\''`)}'`;

function terminate(child: ChildProcessWithoutNullStreams) {
  if (!child.killed) {
    child.kill("SIGTERM");
    setTimeout(() => !child.killed && child.kill("SIGKILL"), 5_000);
  }
}

const app = new Hono()
  .get("/health", (c) => c.text("ok"))
  .use("/", async (c, next) => {
    const token = c.req.query("token");
    if (token) c.req.raw.headers.set("authorization", `Bearer ${token}`);
    await next();
  })
  .use("/", jwt({ secret: process.env.JWT_PUBLIC_KEY!, alg: "RS256" }))
  .get("/", (c) =>
    streamSSE(c, (stream) => {
      return new Promise<void>((resolve) => {
        {
          const payload = jwtPayloadSchema.parse(c.get("jwtPayload"));
          const child = spawn(
            "flyctl",
            [
              "ssh",
              "console",
              "--pty",
              "--app",
              payload.app,
              "--command",
              `sh -c ${escape(payload.command)}`,
            ],
            { env: { ...process.env, ...payload.env } }
          );

          c.req.raw.signal.addEventListener("abort", () => terminate(child));

          const write = (ev: AnyProxyEvent) =>
            stream.writeSSE({ data: JSON.stringify(ev) });

          child.stdout.on("data", (buf) =>
            write({ type: "stdout", data: buf.toString("utf8") })
          );
          child.stderr.on("data", (buf) =>
            write({ type: "stderr", data: buf.toString("utf8") })
          );
          child.on("error", (err) =>
            write({ type: "error", data: { message: err.message } })
          );
          child.on("exit", async (code) => {
            await write({ type: "exit", data: { code } });
            await stream.close();
            resolve();
          });
        }
      });
    })
  );

export type AppType = typeof app;

serve({ fetch: app.fetch, port: Number(process.env.PORT!) }, (info) =>
  console.log("Server started on port", info.port)
);
