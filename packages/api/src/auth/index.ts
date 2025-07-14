import { betterAuth, type User } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { randomUUID } from "crypto";
import { asc, eq } from "drizzle-orm";
import { createDatabase, type Database } from "../database";
import * as schema from "../database/schema/auth";

async function createDefaultOrganization(db: Database, user: User) {
  const organizationId = randomUUID();

  await db
    .insert(schema.organization)
    .values({
      id: organizationId,
      name: "My LP",
      slug: `my-lp-${user.id.split("-")[0]}`,
      logo: user.image,
    })
    .execute();

  await db
    .insert(schema.member)
    .values({
      id: randomUUID(),
      userId: user.id,
      organizationId,
      role: "owner",
    })
    .execute();

  return organizationId;
}

export function createAuth(env: CloudflareBindings) {
  const db = createDatabase(env);
  return betterAuth({
    appName: "LP",
    database: drizzleAdapter(db, { provider: "pg" }),
    basePath: "/auth",
    trustedOrigins: process.env.GODMODE_APP_URLS?.split(","),
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
    },
    plugins: [organization()],
    advanced: { database: { generateId: () => randomUUID() } },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            await createDefaultOrganization(db, user);
          },
        },
      },
      session: {
        create: {
          before: async (session) => {
            const [member] = await db
              .select()
              .from(schema.member)
              .where(eq(schema.member.userId, session.userId))
              .orderBy(asc(schema.member.createdAt))
              .limit(1);

            if (!!member) {
              return {
                data: {
                  ...session,
                  activeOrganizationId: member.organizationId,
                },
              };
            }

            if (!member) {
              const [user] = await db
                .select()
                .from(schema.user)
                .where(eq(schema.user.id, session.userId))
                .limit(1);
              const activeOrganizationId = await createDefaultOrganization(
                db,
                user!
              );
              return { data: { ...session, activeOrganizationId } };
            }
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
