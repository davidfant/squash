import type { ChatMessage } from "@/agent/types";
import { requireActiveOrganization, requireAuth } from "@/auth/middleware";
import type { Database } from "@/database";
import * as schema from "@/database/schema";
import { loadBranchMessages } from "@/database/util/load-branch-messages";
import type { SandboxDurableObjectApp } from "@/durable-objects/sandbox";
import * as FlyioSandbox from "@/lib/flyio/sandbox";
import { zUserMessagePart } from "@/routers/schemas";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { hc } from "hono/client";
import z from "zod";
import { requireRepoBranch } from "./middleware";

export const repoBranchesRouter = new Hono<{
  Bindings: CloudflareBindings;
  Variables: { db: Database };
}>()
  .use(requireAuth, requireActiveOrganization)
  .get(
    "/:branchId",
    zValidator("param", z.object({ branchId: z.uuid() })),
    requireRepoBranch,
    (c) => {
      const { sandbox, ...branch } = c.get("branch");
      return c.json(branch);
    }
  )
  .get(
    "/:branchId/messages",
    requireAuth,
    zValidator("param", z.object({ branchId: z.uuid() })),
    async (c) => {
      const user = c.get("user");
      const { branchId } = c.req.valid("param");
      const messages = await loadBranchMessages(c.get("db"), branchId, user.id);

      if (!messages.length) return c.json({ error: "Project not found" }, 404);
      return c.json(
        messages
          .filter((m) => !!m.parentId)
          .map(
            (m): ChatMessage => ({
              id: m.id,
              role: m.role,
              parts: m.parts,
              metadata: {
                createdAt: m.createdAt.toISOString(),
                parentId: m.parentId!,
              },
            })
          )
      );
    }
  )
  .post(
    "/:branchId/messages",
    zValidator("param", z.object({ branchId: z.uuid() })),
    zValidator(
      "json",
      z.object({
        message: z.object({
          id: z.uuid(),
          parts: z.array(zUserMessagePart),
          parentId: z.uuid(),
        }),
      })
    ),
    requireAuth,
    async (c) => {
      const body = c.req.valid("json");
      const params = c.req.valid("param");
      const user = c.get("user");

      const stub = c.env.SANDBOX_DO.get(
        c.env.SANDBOX_DO.idFromName(params.branchId)
      );
      const client = hc<SandboxDurableObjectApp>("https://thread", {
        fetch: stub.fetch.bind(stub),
      });
      return client.stream.$post({
        json: { ...body, branchId: params.branchId, userId: user.id },
      });
    }
  )
  .post(
    "/:branchId/preview",
    zValidator("param", z.object({ branchId: z.uuid() })),
    zValidator("json", z.object({ sha: z.string().optional() })),
    requireRepoBranch,
    async (c) => {
      const body = c.req.valid("json");
      const params = c.req.valid("param");
      const stub = c.env.SANDBOX_DO.get(
        c.env.SANDBOX_DO.idFromName(params.branchId)
      );
      const res = await hc<SandboxDurableObjectApp>("https://thread", {
        fetch: stub.fetch.bind(stub),
      }).preview.$post({
        json: { sha: body.sha, branchId: params.branchId },
      });
      return c.json(await res.json());
    }
  )
  .post(
    "/:branchId/abort",
    zValidator("param", z.object({ branchId: z.uuid() })),
    zValidator("json", z.object({ messageId: z.uuid().optional() })),
    requireAuth,
    async (c) => {
      const params = c.req.valid("param");
      const body = c.req.valid("json");
      const stub = c.env.SANDBOX_DO.get(
        c.env.SANDBOX_DO.idFromName(params.branchId)
      );
      return hc<SandboxDurableObjectApp>("https://thread", {
        fetch: stub.fetch.bind(stub),
      }).abort.$post({
        json: { branchId: params.branchId, messageId: body.messageId },
      });
    }
  )
  .delete(
    "/:branchId",
    zValidator("param", z.object({ branchId: z.uuid() })),
    requireRepoBranch,
    async (c) => {
      const db = c.get("db");
      const branch = c.get("branch");
      if (branch.sandbox?.type === "flyio") {
        const stub = c.env.SANDBOX_DO.get(
          c.env.SANDBOX_DO.idFromName(branch.id)
        );
        await hc<SandboxDurableObjectApp>("https://thread", {
          fetch: stub.fetch.bind(stub),
        }).abort.$post({
          json: { branchId: branch.id },
        });
        await FlyioSandbox.deleteApp(
          branch.sandbox.appId,
          c.env.FLY_ACCESS_TOKEN
        );
      }

      await db
        .update(schema.repoBranch)
        .set({ deletedAt: new Date(), sandbox: null })
        .where(eq(schema.repoBranch.id, branch.id));
      return c.json({ success: true });
    }
  );
