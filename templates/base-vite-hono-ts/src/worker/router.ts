import { publicProcedure, router } from "./trpc";

export const appRouter = router({
  index: publicProcedure.query(() => {
    return { name: "API" };
  }),
});

export type AppRouter = typeof appRouter;
