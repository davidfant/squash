# Clerk × tRPC Integration Guide

A short, opinionated recipe for plugging **Clerk** session data into **tRPC**.
After this doc you will know how to:

1. Surface `userId` and `orgId` from Clerk in every tRPC request.
2. Guard any procedure with two drop‑in middlewares—`isAuthed` and `isOrgMember`—exported from a single `trpc.ts`.
3. Access those IDs in your resolvers for row‑level security, ownership checks, etc.

Skip what you don’t need and copy‑paste the rest.

---

## Setup Instructions

### 1. Create a Clerk‑aware tRPC context in `trpc.ts`

```ts
import { getAuth } from "@clerk/nextjs/server";
import type { CreateNextContextOptions } from "@trpc/server/adapters/next";

export async function createContext({ req }: CreateNextContextOptions) {
  // Parses the Clerk session cookie → { userId, orgId, sessionId, ... }
  const auth = getAuth(req);

  return {
    auth, // available in every resolver
    // ...add db clients here
  };
}
export type Context = Awaited<ReturnType<typeof createContext>>;
```

---

### 2. Export middlewares in `trpc.ts`

```ts
import { initTRPC, TRPCError } from "@trpc/server";

// ...context

const t = initTRPC.context<Context>().create();

export const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.auth?.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx });
});

export const isOrgMember = t.middleware(({ ctx, next }) => {
  if (!ctx.auth?.orgId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx });
});

export const procedure = t.procedure; // .use(isAuthed) or .use(isOrgMember)
export const router = t.router;
```

> **Why no “protectedProcedure”?**
> We keep zero abstractions — add the middleware where you need it so intent is crystal‑clear.

## Usage Instructions

### 3. Attaching the middlewares

```ts title=server/routers/toolkit.ts
import { z } from "zod";
import { router, procedure, isAuthed, isOrgMember } from "./trpc";

export const toolkitRouter = router({
  getProject: procedure
    .use(isAuthed) // user must be signed‑in
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      const userId = ctx.auth!.userId; // guaranteed
      // ...read project
    }),

  createProject: procedure
    .use(isOrgMember) // must belong to an org
    .input(/* ... */)
    .mutation(({ ctx, input }) => {
      const { orgId, userId } = ctx.auth!; // both present
      // ...create project
    }),
});
```

---

### 4. Quick reference – reading IDs

| You need…   | Middleware you added | Access via         |
| ----------- | -------------------- | ------------------ |
| **User ID** | `isAuthed`           | `ctx.auth.userId!` |
| **Org ID**  | `isOrgMember`        | `ctx.auth.orgId!`  |

The non‑nullable bang (`!`) is safe because the middleware guaranteed presence.
