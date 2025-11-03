import type { Database } from "@/database";
import * as schema from "@/database/schema";
import { and, asc, eq } from "drizzle-orm";

export const loadBranchMessages = (
  db: Database,
  branchId: string,
  organizationId: string
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
    .innerJoin(schema.repo, eq(schema.repoBranch.repoId, schema.repo.id))
    .where(
      and(
        eq(schema.repoBranch.id, branchId),
        eq(schema.repo.organizationId, organizationId)
      )
    )
    .orderBy(asc(schema.message.createdAt));
