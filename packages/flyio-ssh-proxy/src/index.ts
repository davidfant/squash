import { type ChildProcessWithoutNullStreams, spawn } from "child_process";
import { createServer } from "http";
import jwt from "jsonwebtoken";
import { WebSocketServer } from "ws";

["PORT", "JWT_PUBLIC_KEY"].forEach((envVar) => {
  if (!process.env[envVar]) {
    throw new Error(`Required environment variable ${envVar} is not set`);
  }
});

export interface FlyioSSHProxyProxyRequest {
  jwt: string;
}

export interface FlyioSSHProxyJWTPayload {
  app: string;
  cwd: string;
  command: string;
  env: Record<string, string>;
}

export interface FlyioSSHProxyStdoutMessage {
  type: "stdout";
  data: string;
}

export interface FlyioSSHProxyStderrMessage {
  type: "stderr";
  data: string;
}

export interface FlyioSSHProxyExitMessage {
  type: "exit";
  code: number | null;
}

export interface FlyioSSHProxyErrorMessage {
  type: "error";
  message: string;
}

export type FlyioSSHProxyMessage =
  | FlyioSSHProxyStdoutMessage
  | FlyioSSHProxyStderrMessage
  | FlyioSSHProxyExitMessage
  | FlyioSSHProxyErrorMessage;

const stringify = (message: FlyioSSHProxyMessage) => JSON.stringify(message);

const wss = new WebSocketServer({ noServer: true });
wss.on("connection", (ws, req) => {
  let child: ChildProcessWithoutNullStreams | undefined;
  const remote = req.socket.remoteAddress;

  ws.once("message", (first) => {
    // 1. Validate request format
    let request: FlyioSSHProxyProxyRequest;
    try {
      request = JSON.parse(first.toString());
      if (!request.jwt) throw new Error("missing jwt field");
    } catch (e) {
      ws.close(4000, "bad-request");
      return;
    }

    // 2. Verify JWT
    let payload: FlyioSSHProxyJWTPayload;
    try {
      payload = jwt.verify(request.jwt, process.env.JWT_PUBLIC_KEY!, {
        algorithms: ["RS256", "ES256"],
      }) as FlyioSSHProxyJWTPayload;
    } catch (err) {
      ws.close(4001, "invalid-jwt");
      return;
    }

    console.debug(`[${remote}] → ${payload.app} :: ${payload.command}`);

    // 3. Spawn flyctl ssh console
    child = spawn(
      "flyctl",
      [
        "ssh",
        "console",
        "--pty=false",
        "--app",
        payload.app,
        "--command",
        [`cd ${payload.cwd}`, payload.command].join(";\n"),
      ],
      {
        env: {
          PATH: process.env.PATH!,
          HOME: process.env.HOME!,
          ...payload.env,
        },
      }
    );

    child.stdout.on("data", (buf) =>
      ws.send(stringify({ type: "stdout", data: buf.toString("utf8") }))
    );
    child.stderr.on("data", (buf) =>
      ws.send(stringify({ type: "stderr", data: buf.toString("utf8") }))
    );

    child.on("error", (err) => {
      ws.send(stringify({ type: "error", message: err.message }));
      ws.close();
    });

    child.on("close", (code) => {
      ws.send(stringify({ type: "exit", code }));
      ws.close();
    });
  });

  ws.on("close", () => {
    if (child && !child.killed) {
      child.kill("SIGTERM");
      setTimeout(() => {
        if (!child!.killed) child!.kill("SIGKILL");
      }, 5_000);
    }
  });
});

const server = createServer();

server.on("upgrade", (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  });
});

server.listen(Number(process.env.PORT), () =>
  console.log(`flyctl proxy listening on ${process.env.PORT}`)
);
