import { initTRPC } from "@trpc/server";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

export const createContext = (opts: FetchCreateContextFnOptions, env: Env) => ({
  req: opts.req,
  resHeaders: opts.resHeaders,
  env,
});

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

const loggerMiddleware = t.middleware(async ({ path, type, input, next }) => {
  console.log(
    JSON.stringify({
      message: `tRPC request`,
      type,
      path,
      input,
    })
  );
  const start = Date.now();

  const result = await next();

  const durationMs = Date.now() - start;
  console.log(
    JSON.stringify({
      message: `tRPC response`,
      type,
      path,
      input,
      durationMs,
      result: {
        ok: result.ok,
        error: result.ok ? undefined : result.error,
        data: result.ok ? result.data : undefined,
      },
    })
  );

  return result;
});

export const router = t.router;
export const procedure = t.procedure.use(loggerMiddleware);
