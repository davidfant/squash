import { env } from "cloudflare:workers";
import { z } from "zod";
import { composio } from "./integrations/composio";
import { procedure, router } from "./trpc";

export const appRouter = router({
  composio: router({
    isConnected: procedure
      .input(z.object({ toolkitSlug: z.string() }))
      .query(async ({ input }) => {
        const page = await composio.connectedAccounts.list({
          userIds: [env.COMPOSIO_PLAYGROUND_USER_ID],
          toolkitSlugs: [input.toolkitSlug],
          statuses: ["ACTIVE"],
          limit: 1,
        });
        return !!page.items.length;
      }),
    createConnectLink: procedure
      .input(z.object({ toolkitSlug: z.string() }))
      .mutation(async ({ input }) => {
        const authConfigs = await composio.authConfigs.list({
          toolkit: input.toolkitSlug,
        });
        if (!authConfigs.items.length) {
          throw new Error(`Toolkit ${input.toolkitSlug} not connected`);
        }

        const req = await composio.connectedAccounts.link(
          env.COMPOSIO_PLAYGROUND_USER_ID,
          authConfigs.items[0]!.id
        );
        if (!req.redirectUrl) {
          throw new Error("Failed to create connect link");
        }
        return { id: req.id, redirectUrl: req.redirectUrl };
      }),
    waitForConnect: procedure
      .input(z.object({ connectLinkId: z.string() }))
      .mutation(async ({ input }) => {
        await composio.connectedAccounts.waitForConnection(input.connectLinkId);
        return true;
      }),
  }),
});

export type AppRouter = typeof appRouter;
