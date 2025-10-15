import { initTRPC } from "@trpc/server";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

export const createContext = (opts: FetchCreateContextFnOptions, env: Env) => ({
  req: opts.req,
  resHeaders: opts.resHeaders,
  env,
});

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

const loggerMiddleware = t.middleware(async ({ path, type, next }) => {
  console.log(`[${type}] ${path}`);
  const start = Date.now();

  const result = await next();

  const durationMs = Date.now() - start;
  console.log(`[${type}] ${path} completed in ${durationMs}ms`);

  if (!result.ok) {
    console.error(`[${type}] ${path} error:`, result.error);
  }

  return result;
});

export const router = t.router;
export const procedure = t.procedure.use(loggerMiddleware);
