import { createClerkClient } from "@clerk/backend";
import { env } from "cloudflare:workers";

export const clerk = createClerkClient({
  secretKey: env.CLERK_SECRET_KEY,
  publishableKey: env.VITE_CLERK_PUBLISHABLE_KEY,
});
