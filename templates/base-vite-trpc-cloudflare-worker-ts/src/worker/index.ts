import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./trpc";

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext) {
    return fetchRequestHandler({
      endpoint: '/api/trpc',
      req: request,
      router: appRouter,
      createContext: (opts) => createContext(opts, env),
    });
  },
};

export type AppRouter = typeof appRouter;
