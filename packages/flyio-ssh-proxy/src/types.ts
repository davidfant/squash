import { z } from "zod";

export const jwtPayloadSchema = z.object({
  app: z.string(),
  cwd: z.string(),
  command: z.string(),
  env: z.record(z.string(), z.string()),
});

export type JWTPayload = z.infer<typeof jwtPayloadSchema>;

interface ProxyEvent<T extends string, D> {
  type: T;
  data: D;
}

export type ProxyStdoutEvent = ProxyEvent<"stdout", string>;
export type ProxyStderrEvent = ProxyEvent<"stderr", string>;
export type ProxyExitEvent = ProxyEvent<"exit", { code: number | null }>;
export type ProxyErrorEvent = ProxyEvent<"error", { message: string }>;

export type AnyProxyEvent =
  | ProxyStdoutEvent
  | ProxyStderrEvent
  | ProxyExitEvent
  | ProxyErrorEvent;
