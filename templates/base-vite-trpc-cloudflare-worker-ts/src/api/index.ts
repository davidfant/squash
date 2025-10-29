import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext) {
    return fetchRequestHandler({
      endpoint: "/api/trpc",
      req: request,
      router: appRouter,
      createContext: () => ({}),
    });
  },
};

export type AppRouter = typeof appRouter;
