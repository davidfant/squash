import { Composio } from "@composio/core";
import { env } from "cloudflare:workers";
import { z } from "zod";
import { procedure, router } from "./trpc";

const composio = new Composio({ apiKey: env.COMPOSIO_API_KEY });

export const appRouter = router({
  composio: router({
    isConnected: procedure
      .input(z.object({ toolkitSlug: z.string() }))
      .query(async ({ input }) => {
        const page = await composio.connectedAccounts.list({
          userIds: [env.COMPOSIO_USER_ID],
          toolkitSlugs: [input.toolkitSlug],
          statuses: ["ACTIVE"],
          limit: 1,
        });
        return !!page.items.length;
      }),
    createConnectLink: procedure
      .input(z.object({ toolkitSlug: z.string() }))
      .mutation(async ({ input }) => {
        const authConfigId =
          env[`COMPOSIO_${input.toolkitSlug}_AUTH_CONFIG_ID`];
        if (!authConfigId) {
          throw new Error(`Auth config id for ${input.toolkitSlug} not found`);
        }

        const req = await composio.connectedAccounts.link(
          env.COMPOSIO_USER_ID,
          authConfigId
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
