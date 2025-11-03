import {
  requireActiveOrganization,
  requireAuth,
  requireRole,
} from "@/auth/middleware";
import type { Database } from "@/database";
import * as schema from "@/database/schema";
import { zValidator } from "@hono/zod-validator";
import { randomUUID } from "crypto";
import { and, eq, type InferSelectModel } from "drizzle-orm";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import z from "zod";

export const getInvite = createMiddleware<{
  Variables: {
    db: Database;
    invite: InferSelectModel<typeof schema.invitation>;
  };
}>(async (c, next) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const [invite] = await db
    .select()
    .from(schema.invitation)
    .where(eq(schema.invitation.id, id!))
    .limit(1);

  if (!invite) {
    return c.json({ error: "Invite not found" }, 404);
  }

  if (invite.usageCount >= invite.maxUsages) {
    return c.json({ error: "Invite already used" }, 400);
  }

  if (new Date() > invite.expiresAt) {
    return c.json({ error: "Invite expired" }, 400);
  }

  c.set("invite", invite);
  await next();
});

// Create an invite link
export const invitesRouter = new Hono<{
  Bindings: CloudflareBindings;
  Variables: { db: Database };
}>()
  .post(
    "/create",
    requireAuth,
    requireActiveOrganization,
    requireRole("owner", "admin"),
    zValidator(
      "json",
      z.object({
        role: z.enum(["admin", "editor", "viewer"]).optional(),
        path: z.string().optional(),
        maxUsages: z.number().optional(),
      })
    ),
    async (c) => {
      const db = c.get("db");
      try {
        const user = c.get("user");
        const organizationId = c.get("organizationId");
        const data = c.req.valid("json");

        // Generate a unique invite token
        const inviteId = randomUUID();
        const expiresAt = new Date(Date.now() + 365 * 24 * 7 * 60 * 60 * 1000);

        await db.insert(schema.invitation).values({
          id: inviteId,
          organizationId,
          role: data.role,
          expiresAt,
          inviterId: user.id,
          maxUsages: data.maxUsages,
          path: data.path,
        });

        return c.json({
          success: true,
          inviteId,
          inviteUrl: `${c.env.APP_URL}/invite/${inviteId}`,
        });
      } catch (error) {
        console.error("Error creating invite:", error);
        return c.json({ error: "Failed to create invite" }, 500);
      }
    }
  )
  .get("/:id", async (c) => {
    try {
      const id = c.req.param("id");
      const db = c.get("db");

      const [invite] = await db
        .select({
          invitation: schema.invitation,
          organization: {
            id: schema.organization.id,
            name: schema.organization.name,
            logo: schema.organization.logo,
          },
          inviter: {
            id: schema.user.id,
            name: schema.user.name,
            image: schema.user.image,
          },
        })
        .from(schema.invitation)
        .innerJoin(
          schema.organization,
          eq(schema.invitation.organizationId, schema.organization.id)
        )
        .innerJoin(schema.user, eq(schema.invitation.inviterId, schema.user.id))
        .where(eq(schema.invitation.id, id))
        .limit(1);

      if (!invite) {
        return c.json({ error: "Invite not found" }, 404);
      }

      if (invite.invitation.usageCount >= invite.invitation.maxUsages) {
        return c.json({ error: "Invite already used" }, 400);
      }

      if (new Date() > invite.invitation.expiresAt) {
        return c.json({ error: "Invite expired" }, 400);
      }

      return c.json({
        id: invite.invitation.id,
        role: invite.invitation.role,
        path: invite.invitation.path,
        organization: invite.organization,
        inviter: invite.inviter,
        expiresAt: invite.invitation.expiresAt,
      });
    } catch (error) {
      console.error("Error fetching invite:", error);
      return c.json({ error: "Failed to fetch invite" }, 500);
    }
  })
  .post(
    "/:id/accept",
    requireAuth,
    zValidator("param", z.object({ id: z.string() })),
    getInvite,
    async (c) => {
      try {
        const user = c.get("user");
        const invite = c.get("invite");
        const db = c.get("db");

        // Check if user is already a member
        const [existingMember] = await db
          .select()
          .from(schema.member)
          .where(
            and(
              eq(schema.member.userId, user.id),
              eq(schema.member.organizationId, invite.organizationId)
            )
          )
          .limit(1);

        if (existingMember) {
          await db
            .update(schema.user)
            .set({ activeOrganizationId: invite.organizationId })
            .where(eq(schema.user.id, user.id));

          c.set("session", {
            userId: user.id,
            activeOrganizationId: invite.organizationId,
          });

          return c.json({
            success: true,
            message: "Already a member. Switched to organization.",
            organizationId: invite.organizationId,
          });
        }

        // Add user to organization
        const tx = db;
        // await db.transaction(async (tx) => {
        await Promise.all([
          tx.insert(schema.member).values({
            userId: user.id,
            organizationId: invite.organizationId,
            role: invite.role,
          }),
          tx
            .update(schema.invitation)
            .set({ usageCount: invite.usageCount + 1 })
            .where(eq(schema.invitation.id, invite.id)),
          tx
            .update(schema.user)
            .set({ activeOrganizationId: invite.organizationId })
            .where(eq(schema.user.id, user.id)),
        ]);
        // });

        c.set("session", {
          userId: user.id,
          activeOrganizationId: invite.organizationId,
        });

        return c.json({
          success: true,
          message: "Successfully joined organization",
          organizationId: invite.organizationId,
        });
      } catch (error) {
        console.error("Error accepting invite:", error);
        return c.json({ error: "Failed to accept invite" }, 500);
      }
    }
  );
