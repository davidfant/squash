import { requireActiveOrganization, requireAuth } from "@/auth/middleware";
import type { Database } from "@/database";
import * as schema from "@/database/schema";
import * as FlyioSandbox from "@/lib/flyio/sandbox";
import { google } from "@ai-sdk/google";
import { zValidator } from "@hono/zod-validator";
import { createAppAuth } from "@octokit/auth-app";
import { generateText } from "ai";
import { randomUUID } from "crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import kebabCase from "lodash.kebabcase";
import z from "zod";
import { zUserMessagePart } from "../chat";
import { requireRepo } from "./middleware";

export const reposRouter = new Hono<{
  Bindings: CloudflareBindings;
  Variables: { db: Database };
}>()
  .use(requireAuth, requireActiveOrganization)
  .get("/", async (c) => {
    const user = c.get("user");
    const db = c.get("db");
    const organizationId = c.get("organizationId");

    const repos = await db
      .select({
        id: schema.repo.id,
        name: schema.repo.name,
        createdAt: schema.repo.createdAt,
        updatedAt: schema.repo.updatedAt,
      })
      .from(schema.repo)
      .innerJoin(
        schema.organization,
        eq(schema.repo.organizationId, schema.organization.id)
      )
      .innerJoin(
        schema.member,
        eq(schema.organization.id, schema.member.organizationId)
      )
      .orderBy(desc(schema.repo.name))
      .where(
        and(
          eq(schema.organization.id, organizationId),
          isNull(schema.repo.deletedAt),
          eq(schema.member.userId, user.id)
        )
      );

    return c.json(repos);
  })
  .delete(
    "/:repoId",
    zValidator("param", z.object({ repoId: z.string() })),
    requireRepo,
    async (c) => {
      const repo = c.get("repo");
      const db = c.get("db");

      try {
        // Soft delete the repository
        await db
          .update(schema.repo)
          .set({ deletedAt: new Date() })
          .where(eq(schema.repo.id, repo.id));

        return c.json({ success: true });
      } catch (error) {
        console.error("Error deleting repository:", error);
        return c.json({ error: "Failed to delete repository" }, 500);
      }
    }
  )
  .put(
    "/:repoId/snapshot",
    zValidator("param", z.object({ repoId: z.string() })),
    zValidator(
      "json",
      z.object({
        snapshot: z.object({
          type: z.literal("docker"),
          port: z.number(),
          image: z.string(),
          entrypoint: z.string(),
          workdir: z.string(),
        }),
      })
    ),
    requireRepo,
    async (c) => {
      const repo = c.get("repo");
      const db = c.get("db");
      const { snapshot } = c.req.valid("json");

      try {
        // Update the repo with new snapshot
        await db
          .update(schema.repo)
          .set({
            snapshot: snapshot,
            updatedAt: new Date(),
          })
          .where(eq(schema.repo.id, repo.id));

        return c.json({
          message: "Snapshot updated successfully",
          snapshot: snapshot,
        });
      } catch (error) {
        console.error("Error updating snapshot:", error);
        return c.json({ error: "Failed to update snapshot" }, 500);
      }
    }
  )
  .post(
    "/",
    zValidator(
      "json",
      z.object({
        name: z.string(),
        url: z.string().url(),
        defaultBranch: z.string(),
        snapshot: z.object({
          type: z.literal("docker"),
          port: z.number(),
          image: z.string(),
          entrypoint: z.string(),
          workdir: z.string(),
        }),
      })
    ),
    requireAuth,
    requireActiveOrganization,
    async (c) => {
      const { name, url, defaultBranch, snapshot } = c.req.valid("json");
      const organizationId = c.get("organizationId");
      const db = c.get("db");

      try {
        const [newRepo] = await db
          .insert(schema.repo)
          .values({
            name,
            url,
            defaultBranch,
            private: false,
            providerId: null,
            externalId: null,
            organizationId,
            snapshot,
          })
          .returning();

        return c.json(newRepo!);
      } catch (error) {
        console.error("Error creating repository:", error);
        return c.json({ error: "Failed to create repository" }, 500);
      }
    }
  )
  .post(
    "/:repoId/branches",
    zValidator("param", z.object({ repoId: z.string().uuid() })),
    zValidator(
      "json",
      z.object({
        message: z.object({ parts: zUserMessagePart.array().min(1) }),
      })
    ),
    requireRepo,
    async (c) => {
      const { repoId } = c.req.valid("param");
      const { message } = c.req.valid("json");
      const organizationId = c.get("organizationId");
      const user = c.get("user");
      const db = c.get("db");
      const repo = c.get("repo");

      try {
        const ipAddress =
          c.req.header("cf-connecting-ip") ??
          c.req.header("x-forwarded-for") ??
          c.req.raw.headers.get("x-forwarded-for");

        const thread = await db
          .insert(schema.messageThread)
          .values({ ipAddress })
          .returning()
          .then(([thread]) => thread!);

        const parentId = randomUUID();
        await db.insert(schema.message).values([
          { id: parentId, role: "system", threadId: thread.id, parts: [] },
          { role: "user", parts: message.parts, threadId: thread.id, parentId },
        ]);

        const textContent = message.parts
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join(" ");

        const { text: title } = await generateText({
          model: google("gemini-2.5-flash"),
          prompt: `Generate a concise Jira ticket name (title case, max 50 chars) for this feature request: "${textContent}". Only return the branch name, nothing else.`,
          providerOptions: {
            google: { thinkingConfig: { thinkingBudget: 0 } },
          },
        });

        const branchId = randomUUID();
        const branchName = `${kebabCase(title)}-${branchId.split("-")[0]}`;

        const flyioAppIdPrefix = `${organizationId.split("-")[0]}-${
          repo.id.split("-")[0]
        }-${branchId.split("-")[0]!}-`;
        const flyioAppId = `${flyioAppIdPrefix}${kebabCase(title).slice(
          0,
          63 - flyioAppIdPrefix.length
        )}`;

        try {
          await FlyioSandbox.createApp(
            flyioAppId,
            c.env.FLY_ACCESS_TOKEN,
            c.env.FLY_ORG_SLUG
          );

          const flyMachine = await FlyioSandbox.createMachine({
            appId: flyioAppId,
            git: {
              url: repo.url,
              branch: branchName,
              workdir: repo.snapshot.workdir,
            },
            snapshot: repo.snapshot,
            auth: {
              github:
                repo.provider?.type === "github"
                  ? {
                      username: "x-access-token",
                      password: await createAppAuth({
                        appId: c.env.GITHUB_APP_ID,
                        privateKey: c.env.GITHUB_APP_PRIVATE_KEY,
                        installationId: repo.provider.data.installationId,
                      })({ type: "installation", installationId: "" }).then(
                        (auth) => auth.token
                      ),
                    }
                  : undefined,
              aws: !repo.provider
                ? {
                    accessKeyId: c.env.R2_REPOS_ACCESS_KEY_ID,
                    secretAccessKey: c.env.R2_REPOS_SECRET_ACCESS_KEY,
                    endpointUrl: c.env.R2_REPOS_ENDPOINT_URL_S3,
                    region: "auto",
                  }
                : undefined,
            },
            accessToken: c.env.FLY_ACCESS_TOKEN,
          });

          // Create repo branch record
          const [repoBranch] = await db
            .insert(schema.repoBranch)
            .values({
              id: branchId,
              title,
              name: branchName,
              sandbox: {
                type: "flyio",
                appId: flyioAppId,
                machineId: flyMachine.id,
                url: `https://${flyioAppId}.fly.dev`,
                workdir: repo.snapshot.workdir,
              },
              threadId: thread.id,
              repoId: repoId,
              createdBy: user.id,
            })
            .returning();

          return c.json(repoBranch!);
        } catch (error) {
          await FlyioSandbox.deleteApp(
            branchName,
            c.env.FLY_ACCESS_TOKEN
          ).catch(() => {});
          throw error;
        }
      } catch (error) {
        console.error("Error creating repo branch:", error);
        return c.json({ error: "Failed to create repo branch" }, 500);
      }
    }
  )
  .get(
    "/:repoId/branches",
    zValidator("param", z.object({ repoId: z.string().uuid() })),
    async (c) => {
      const { repoId } = c.req.valid("param");
      const user = c.get("user");
      const db = c.get("db");
      const organizationId = c.get("organizationId");

      const branches = await db
        .select({
          id: schema.repoBranch.id,
          title: schema.repoBranch.title,
          name: schema.repoBranch.name,
          createdAt: schema.repoBranch.createdAt,
          updatedAt: schema.repoBranch.updatedAt,
          repo: { id: schema.repo.id, name: schema.repo.name },
          createdBy: {
            id: schema.user.id,
            name: schema.user.name,
            image: schema.user.image,
          },
        })
        .from(schema.repo)
        .innerJoin(
          schema.repoBranch,
          eq(schema.repo.id, schema.repoBranch.repoId)
        )
        .innerJoin(schema.user, eq(schema.repoBranch.createdBy, schema.user.id))
        .innerJoin(
          schema.member,
          eq(schema.repo.organizationId, schema.member.organizationId)
        )
        .where(
          and(
            eq(schema.repo.id, repoId),
            eq(schema.repo.organizationId, organizationId),
            isNull(schema.repo.deletedAt),
            eq(schema.member.userId, user.id),
            isNull(schema.repoBranch.deletedAt)
          )
        )
        .orderBy(desc(schema.repoBranch.createdAt));

      return c.json(branches);
    }
  );
