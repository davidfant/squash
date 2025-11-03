import type { Database } from "@/database";
import * as schema from "@/database/schema";
import type { WebhookEvent } from "@clerk/backend";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { Webhook } from "svix";

export const clerkWebhookRouter = new Hono<{
  Bindings: CloudflareBindings;
  Variables: { db: Database };
}>().post("/", async (c) => {
  const db = c.get("db");

  // ----- 1.  pull Svix headers  -----
  const svixId = c.req.header("svix-id");
  const svixTs = c.req.header("svix-timestamp");
  const svixSignature = c.req.header("svix-signature");

  if (!svixId || !svixTs || !svixSignature) {
    return c.json({ error: "Missing Svix headers" }, 400);
  }

  // ----- 2.  verify signature  -----
  const bodyText = await c.req.text();

  try {
    const wh = new Webhook(c.env.CLERK_WEBHOOK_SECRET);
    const evt = wh.verify(bodyText, {
      "svix-id": svixId,
      "svix-timestamp": svixTs,
      "svix-signature": svixSignature,
    }) as WebhookEvent;

    switch (evt.type) {
      case "user.created":
      case "user.updated":
        await db
          .insert(schema.user)
          .values({
            id: evt.data.id,
            // email: evt.data.email_addresses?.[0]?.email_address ?? null,
            username: evt.data.username,
            firstName: evt.data.first_name,
            lastName: evt.data.last_name,
            imageUrl: evt.data.image_url,
          })
          .onConflictDoUpdate({
            target: schema.user.id,
            set: {
              username: evt.data.username,
              firstName: evt.data.first_name,
              lastName: evt.data.last_name,
              imageUrl: evt.data.image_url,
              updatedAt: new Date(),
            },
          });
        break;

      case "user.deleted":
        await db.delete(schema.user).where(eq(schema.user.id, evt.data.id!));
        break;

      default:
      // ignore other events
    }

    return c.json({ ok: true });
  } catch (err) {
    console.error("⛔️  Clerk webhook signature failed", err);
    return c.json({ error: "Bad signature" }, 400);
  }
});
