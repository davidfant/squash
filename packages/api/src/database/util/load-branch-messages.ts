import type { Database } from "@/database";
import * as schema from "@/database/schema";
import { and, asc, eq } from "drizzle-orm";

export const loadBranchMessages = (
  db: Database,
  branchId: string,
  userId: string
) =>
  db
    .select({
      id: schema.message.id,
      role: schema.message.role,
      parts: schema.message.parts,
      createdAt: schema.message.createdAt,
      threadId: schema.message.threadId,
      parentId: schema.message.parentId,
    })
    .from(schema.repoBranch)
    .innerJoin(
      schema.message,
      eq(schema.message.threadId, schema.repoBranch.threadId)
    )
    .innerJoin(schema.repo, eq(schema.repo.id, schema.repoBranch.repoId))
    .innerJoin(
      schema.member,
      eq(schema.repo.organizationId, schema.member.organizationId)
    )
    .where(
      and(eq(schema.repoBranch.id, branchId), eq(schema.member.userId, userId))
    )
    .orderBy(asc(schema.message.createdAt));
