import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./trpc";

export default {
  async fetch(request: Request) {
    return fetchRequestHandler({
      endpoint: "/api/trpc",
      req: request,
      router: appRouter,
      createContext,
    });
  },
};

export type AppRouter = typeof appRouter;
