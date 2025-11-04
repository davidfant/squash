import { clerkMiddleware } from "@hono/clerk-auth";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { requestId } from "hono/request-id";
import { OpenAI } from "openai";
import z from "zod";
import { databaseMiddleware } from "./database/middleware";
import { createSignedAndPublicUrl } from "./lib/cloudflare";
import { logger } from "./lib/logger";
import { repoBranchesRouter } from "./routers/branches";
import { reposRouter } from "./routers/repos";
import { clerkWebhookRouter } from "./routers/webhooks/clerk";

const app = new Hono<{ Bindings: CloudflareBindings }>()
  .use("*", cors({ origin: process.env.APP_URL, credentials: true }))
  .use(requestId())
  .use(honoLogger())
  .use(databaseMiddleware)
  .use(clerkMiddleware())
  .route("/branches", repoBranchesRouter)
  .route("/repos", reposRouter)
  .route("/webhooks/clerk", clerkWebhookRouter)
  .post(
    "/upload",
    zValidator("json", z.object({ filename: z.string() })),
    async (c) => {
      const filename = c.req.valid("json").filename;
      const res = await createSignedAndPublicUrl(filename, {
        accessKeyId: c.env.R2_UPLOADS_ACCESS_KEY_ID,
        secretAccessKey: c.env.R2_UPLOADS_SECRET_ACCESS_KEY,
        bucketUrl: c.env.R2_UPLOADS_BUCKET_URL,
        endpointUrl: c.env.R2_UPLOADS_ENDPOINT_URL_S3,
      });
      return c.json(res);
    }
  )
  .post("/transcribe", async (c) => {
    const formData = await c.req.raw.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return c.json({ error: "Missing file" }, 400);

    const openai = new OpenAI({ apiKey: c.env.OPENAI_API_KEY });
    const result = await openai.audio.transcriptions.create({
      file,
      model: "gpt-4o-transcribe",
    });

    return c.text(result.text);
  })
  .onError(async (err, c) => {
    logger.error("Hono Unhandled Error", {
      requestId: c.get("requestId"),
      route: c.req.path,
      query: c.req.query(),
      body: await c.req.text().catch(() => "Failed to read body"),
      stack: err.stack,
      name: err.name,
      cause: err.cause,
      message: err.message,
    });
    c.executionCtx.waitUntil(Promise.reject(err));
    return c.json({ error: "Internal server error" }, 500);
  });

export default app;
export type AppType = typeof app;

export { DaytonaSandboxManager } from "./sandbox/daytona/manager";
export type { ClerkOrganizationRole as ClerkRole } from "./types";
