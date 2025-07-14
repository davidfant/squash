import { zValidator } from "@hono/zod-validator";
import { coreUserMessageSchema } from "ai";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { requestId } from "hono/request-id";
import { streamSSE } from "hono/streaming";
import { authMiddleware } from "./auth/middleware";
import { databaseMiddleware } from "./database/middleware";
import { createQualifyAgent } from "./mastra/qualify";

export default new Hono<{ Bindings: CloudflareBindings }>()
  .use(requestId())
  .use(logger())
  .use(databaseMiddleware)
  .use(authMiddleware)
  .use("*", cors({ origin: process.env.APP_URL, credentials: true }))
  .on(["GET", "POST"], "/auth/*", (c) => c.get("auth").handler(c.req.raw))
  .post("/chat", zValidator("json", coreUserMessageSchema), async (c) => {
    const message = c.req.valid("json");
    const agent = createQualifyAgent(c.env.DATABASE_URL);

    return streamSSE(c, async (stream) => {
      const s = await agent.stream([message], {
        providerOptions: {
          google: { thinkingConfig: { includeThoughts: true } },
        },
      });
      for await (const delta of s.fullStream) {
        switch (delta.type) {
          // TODO: remove model metadata/prompts...
          // case "step-start":
          // case "step-finish":
          // case "finish":
          //   break;
          case "error":
            await stream.writeSSE({
              event: "error",
              data: (delta.error as Error).message,
              id: c.get("requestId"),
            });
            break;
          default:
            await stream.writeSSE({ data: JSON.stringify(delta) });
            break;
        }
      }

      s.text;
      // await stream.writeSSE({ event: "done", data: "" });
    });
  });
