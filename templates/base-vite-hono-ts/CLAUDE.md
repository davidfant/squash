## Environment

The current project is a Cloudflare Worker containing a Vite React app and a tRPC API. This will be deployed in a Cloudflare Worker and must run in workerd.

Use pnpm as your package manager, not npm or yarn

Store environment variables in `.dev.vars`. When updating `.dev.vars` always run `pnpm typegen` afterwards so that Cloudflare Worker TypeScript types are updated correctly.

## API best practices
- Use tRPC procedures to define your API endpoints
- Make sure to always validate input using Zod schemas with `.input()` on procedures
- Make sure to always type the API route output strongly using `.output()` or by returning typed data. This ensures that the React app can use the API in a type-safe way.

## Interacting with the API from the React App

The project uses tRPC with React Query integration for type-safe API calls:
`import { trpc } from "@/trpc";`

This provides **fully type-safe** API calls with automatic type inference from your tRPC router.

**Core Concepts**

- **Queries**: Use `trpc.[procedure].useQuery()` for fetching data
- **Mutations**: Use `trpc.[procedure].useMutation()` for data modifications
- Full TypeScript type safety from server to client with zero code generation
- Automatic React Query integration with caching, refetching, and optimistic updates

---

**Queries**

```tsx
import { trpc } from "@/trpc";

function UserCard({ id }: { id: string }) {
  const query = trpc.users.getById.useQuery({ id });

  if (query.isLoading) return <Spinner />;
  if (query.isError) return <Error msg={query.error.message} />;
  return <div>{query.data.name}</div>;
}
```

Notes:

- Input parameters are automatically typed based on your tRPC procedure's `.input()` schema
- The returned `data` is automatically typed based on your procedure's return type
- All standard React Query options are available (enabled, refetchInterval, etc.)

---

**Mutations**

```tsx
import { trpc } from "@/trpc";

function RenameUser({ id }: { id: string }) {
  const utils = trpc.useUtils(); // tRPC utilities for cache management

  const mutation = trpc.users.update.useMutation({
    onSuccess: (data) => {
      // data is fully typed based on your procedure's return type
      utils.users.getById.invalidate({ id }); // invalidate and refetch
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const name = new FormData(e.currentTarget).get("name") as string;
        mutation.mutate({ id, name });
      }}
    >
      <input name="name" />
      <button disabled={mutation.isPending}>Save</button>
    </form>
  );
}
```

Notes:

- `mutation.mutate()` accepts parameters matching your procedure's `.input()` schema
- On failure, `mutation.error` contains the error details
- Use `trpc.useUtils()` for cache management and optimistic updates

---

**Defining tRPC Procedures**

In [src/worker/router.ts](src/worker/router.ts), define your API endpoints:

```typescript
import { z } from "zod";
import { publicProcedure, router } from "./trpc";

export const appRouter = router({
  users: router({
    getById: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        // Fetch user by ID
        return { id: input.id, name: "John Doe" };
      }),
    update: publicProcedure
      .input(z.object({ id: z.string(), name: z.string() }))
      .mutation(async ({ input }) => {
        // Update user
        return { id: input.id, name: input.name };
      }),
  }),
});

export type AppRouter = typeof appRouter;
```

**Error Handling Pattern**

```tsx
if (query.error) {
  return <Alert variant="destructive">{query.error.message}</Alert>;
}
```

tRPC provides type-safe error handling with detailed error information automatically propagated to the client.
