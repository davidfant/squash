import { requireAuth } from "@/auth/middleware";
import type { Database } from "@/database";
import * as schema from "@/database/schema/auth";
import { randomBytes, randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { Hono } from "hono";

const sessionLifetimeHours = 12;

function createToken() {
  return randomBytes(32).toString("hex");
}

export const authRouter = new Hono<{
  Bindings: CloudflareBindings;
  Variables: {
    db: Database;
    user: typeof schema.user.$inferSelect;
    session: {
      userId: string;
      activeOrganizationId: string | null;
    };
  };
}>()
  .get("/me", requireAuth, (c) => {
    const user = c.get("user");
    const session = c.get("session");

    return c.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
      session,
    });
  })
  .get("/token", requireAuth, async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + sessionLifetimeHours * 60 * 60 * 1000
    );
    const token = createToken();

    await db
      .delete(schema.session)
      .where(eq(schema.session.userId, user.id))
      .execute();

    await db
      .insert(schema.session)
      .values({
        id: randomUUID(),
        userId: user.id,
        token,
        createdAt: now,
        updatedAt: now,
        expiresAt,
        activeOrganizationId: user.activeOrganizationId ?? null,
      })
      .execute();

    return c.json({ token, expiresAt: expiresAt.toISOString() });
  });
