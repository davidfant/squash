import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { requestId } from "hono/request-id";
import { authMiddleware } from "./auth/middleware";
import { databaseMiddleware } from "./database/middleware";
import { projectsRouter } from "./routers/projects";
import { threadsRouter } from "./routers/threads";

const app = new Hono<{ Bindings: CloudflareBindings }>()
  .use(requestId())
  .use(logger())
  .use(databaseMiddleware)
  .use(authMiddleware)
  .use("*", cors({ origin: process.env.APP_URL, credentials: true }))
  .on(["GET", "POST"], "/auth/*", (c) => c.get("auth").handler(c.req.raw))
  .route("/projects", projectsRouter)
  .route("/threads", threadsRouter);

export default app;
export type AppType = typeof app;
