import { createClerkClient, type ClerkClient } from "@clerk/backend";
import { randomUUID } from "crypto";
import { and, asc, eq, type InferSelectModel } from "drizzle-orm";
import kebabCase from "lodash.kebabcase";
import { type Database } from "../database";
import * as schema from "../database/schema/auth";

const CLERK_PROVIDER_ID = "clerk";

export type DbUser = InferSelectModel<typeof schema.user>;

function selectUserById(db: Database, userId: string) {
  return db
    .select()
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1)
    .then(([user]) => user);
}

async function createDefaultOrganization(db: Database, user: DbUser) {
  const organizationId = randomUUID();

  await db
    .insert(schema.organization)
    .values({
      id: organizationId,
      name: user.name,
      slug: `${kebabCase(user.name)}-${user.id.split("-")[0]}`,
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

async function resolveActiveOrganization(db: Database, user: DbUser) {
  if (user.activeOrganizationId) {
    return user.activeOrganizationId;
  }

  const [member] = await db
    .select()
    .from(schema.member)
    .where(eq(schema.member.userId, user.id))
    .orderBy(asc(schema.member.createdAt))
    .limit(1);

  if (member) {
    await db
      .update(schema.user)
      .set({ activeOrganizationId: member.organizationId })
      .where(eq(schema.user.id, user.id));
    return member.organizationId;
  }

  const organizationId = await createDefaultOrganization(db, user);
  await db
    .update(schema.user)
    .set({ activeOrganizationId: organizationId })
    .where(eq(schema.user.id, user.id));
  return organizationId;
}

async function createUserFromClerk(
  db: Database,
  clerk: ClerkClient,
  clerkUserId: string
) {
  const clerkUser = await clerk.users.getUser(clerkUserId);
  const userId = randomUUID();

  const primaryEmail =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    "";

  const emailVerified =
    clerkUser.primaryEmailAddress?.verification?.status === "verified" ||
    clerkUser.emailAddresses.some(
      (email) => email.verification?.status === "verified"
    );

  const name =
    clerkUser.fullName ??
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim() ||
    clerkUser.username ||
    primaryEmail ||
    "New User";

  await db.insert(schema.user).values({
    id: userId,
    name,
    email: primaryEmail,
    emailVerified,
    image: clerkUser.imageUrl ?? undefined,
  });

  await db.insert(schema.account).values({
    id: randomUUID(),
    accountId: clerkUserId,
    providerId: CLERK_PROVIDER_ID,
    userId,
  });

  const user = await selectUserById(db, userId);
  if (!user) {
    throw new Error("Failed to create user record");
  }

  const organizationId = await createDefaultOrganization(db, user);
  await db
    .update(schema.user)
    .set({ activeOrganizationId: organizationId })
    .where(eq(schema.user.id, userId));

  return {
    ...user,
    activeOrganizationId: organizationId,
  } satisfies DbUser;
}

export async function getUserWithActiveOrganization(
  db: Database,
  userId: string
) {
  const user = await selectUserById(db, userId);
  if (!user) return null;

  const activeOrganizationId = await resolveActiveOrganization(db, user);

  return {
    ...user,
    activeOrganizationId,
  } satisfies DbUser;
}

export async function ensureUser({
  db,
  clerk,
  clerkUserId,
}: {
  db: Database;
  clerk: ClerkClient;
  clerkUserId: string;
}) {
  const existingAccount = await db
    .select({
      userId: schema.account.userId,
    })
    .from(schema.account)
    .where(
      and(
        eq(schema.account.providerId, CLERK_PROVIDER_ID),
        eq(schema.account.accountId, clerkUserId)
      )
    )
    .limit(1)
    .then(([account]) => account);

  if (!existingAccount) {
    return createUserFromClerk(db, clerk, clerkUserId);
  }

  const user = await getUserWithActiveOrganization(db, existingAccount.userId);
  if (!user) {
    return createUserFromClerk(db, clerk, clerkUserId);
  }

  return user;
}

export function createClerk(env: CloudflareBindings) {
  return createClerkClient({
    secretKey: env.CLERK_SECRET_KEY,
    publishableKey: env.CLERK_PUBLISHABLE_KEY,
  });
}
