import { z } from "zod";
import { composio } from "./integrations/composio";
import { protectedProcedure, router } from "./trpc";

const connectScope = z.union([z.literal("org"), z.literal("user")]);

export const appRouter = router({
  composio: router({
    isConnected: protectedProcedure
      .input(z.object({ toolkitSlug: z.string(), scope: connectScope }))
      .query(async ({ input, ctx }) => {
        const page = await composio.connectedAccounts.list({
          userIds: input.scope === "org" ? [ctx.auth.orgId] : [ctx.auth.userId],
          toolkitSlugs: [input.toolkitSlug],
          statuses: ["ACTIVE"],
          limit: 1,
        });
        return !!page.items.length;
      }),
    createConnectLink: protectedProcedure
      .input(z.object({ toolkitSlug: z.string(), scope: connectScope }))
      .mutation(async ({ input, ctx }) => {
        const authConfigs = await composio.authConfigs.list({
          toolkit: input.toolkitSlug,
        });
        if (!authConfigs.items.length) {
          throw new Error(`Toolkit ${input.toolkitSlug} not connected`);
        }

        const req = await composio.connectedAccounts.link(
          input.scope === "org" ? ctx.auth.orgId : ctx.auth.userId,
          authConfigs.items[0]!.id
        );
        if (!req.redirectUrl) {
          throw new Error("Failed to create connect link");
        }
        return { id: req.id, redirectUrl: req.redirectUrl };
      }),
    waitForConnect: protectedProcedure
      .input(z.object({ connectLinkId: z.string() }))
      .mutation(async ({ input }) => {
        await composio.connectedAccounts.waitForConnection(input.connectLinkId);
        return true;
      }),
  }),
});

export type AppRouter = typeof appRouter;
