import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { requestId } from "hono/request-id";
import { authMiddleware } from "./auth/middleware";
import { databaseMiddleware } from "./database/middleware";
import { chatRouter } from "./routers/chat";
import { githubRouter } from "./routers/integrations/github";
import { replicatorRouter } from "./routers/replicator";
import { reposRouter } from "./routers/repos";
import { repoBranchesRouter } from "./routers/repos/branches";
import { repoProvidersRouter } from "./routers/repos/providers";

const app = new Hono<{ Bindings: CloudflareBindings }>()
  .use("*", cors({ origin: process.env.APP_URL, credentials: true }))
  .use(requestId())
  .use(logger())
  .use(databaseMiddleware)
  .use(authMiddleware)
  .on(["GET", "POST"], "/auth/*", (c) => c.get("auth").handler(c.req.raw))
  .route("/chat", chatRouter)
  .route("/replicator", replicatorRouter)
  .route("/repos/providers", repoProvidersRouter)
  .route("/repos/branches", repoBranchesRouter)
  .route("/repos", reposRouter)
  .route("/integrations/github", githubRouter);

export default app;
export type AppType = typeof app;
