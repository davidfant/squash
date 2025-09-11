import { requireActiveOrganization, requireAuth } from "@/auth/middleware";
import type { Database } from "@/database";
import * as schema from "@/database/schema";
import * as FlyioExec from "@/lib/flyio/exec";
import * as FlyioSandbox from "@/lib/flyio/sandbox";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import z from "zod";
import { requireRepoBranch } from "./middleware";

export const repoBranchesRouter = new Hono<{
  Bindings: CloudflareBindings;
  Variables: { db: Database };
}>()
  .use(requireAuth, requireActiveOrganization)
  .get(
    "/:branchId",
    zValidator("param", z.object({ branchId: z.string().uuid() })),
    requireRepoBranch,
    (c) => {
      const { sandbox, ...branch } = c.get("branch");
      return c.json(branch);
    }
  )
  // TODO: using e.g. fly health checks or similar, stream progress of machine creation
  .post(
    "/:branchId/preview",
    zValidator("param", z.object({ branchId: z.string().uuid() })),
    zValidator("json", z.object({ sha: z.string().optional() })),
    requireRepoBranch,
    async (c) => {
      const branch = c.get("branch");
      await FlyioSandbox.waitForMachineHealthy(
        branch.sandbox.appId,
        branch.sandbox.machineId,
        c.env.FLY_ACCESS_TOKEN
      );
      const { sha } = c.req.valid("json");
      const context: FlyioExec.FlyioExecSandboxContext = {
        ...branch.sandbox,
        accessToken: c.env.FLY_ACCESS_TOKEN,
      };
      if (sha) {
        await FlyioExec.gitReset(context, sha);
        return c.json({ url: branch.sandbox.url, sha });
      } else {
        const sha = await FlyioExec.gitCurrentCommit(context);
        return c.json({ url: branch.sandbox.url, sha });
      }
    }
  )
  .delete(
    "/:branchId",
    zValidator("param", z.object({ branchId: z.string().uuid() })),
    requireRepoBranch,
    async (c) => {
      const db = c.get("db");
      const branch = c.get("branch");
      if (branch.sandbox.type === "flyio") {
        await FlyioSandbox.deleteApp(
          branch.sandbox.appId,
          c.env.FLY_ACCESS_TOKEN
        );
      }

      await db
        .update(schema.repoBranch)
        .set({ deletedAt: new Date() })
        .where(eq(schema.repoBranch.id, branch.id));

      return c.json({ success: true });
    }
  );
