import { initTRPC } from "@trpc/server";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

export const createContext = (opts: FetchCreateContextFnOptions, env: Env) => ({
  req: opts.req,
  resHeaders: opts.resHeaders,
  env,
})

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;