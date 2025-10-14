## Environment

The current project is a Cloudflare Worker containing a Vite React app and a Hono API. This will be deployed in a Cloudflare Worker and must run in workerd.

Use pnpm as your package manager, not npm or yarn

Store environment variables in `.dev.vars`. When updating `.dev.vars` always run `pnpm typegen` afterwards so that Cloudflare Worker TypeScript types are updated correctly.

## API best practices
Make sure to always validate input such as params and json using `import { zValidator } from "@hono/zod-validator";`.

## Interacting with the API from the React App

There are two type-safe wrappers around React Query + Hono Client to interact with the API:
`import { useQuery, useMutation } from "@/api";`

These helper hoooks keep your React code **fully type-safe** while hiding boilerplate.

**Core Ideas**

| Hook          | What it wraps      | Success type automatically inferred from            | Error handling              |
| ------------- | ------------------ | --------------------------------------------------- | --------------------------- |
| `useQuery`    | `useReactQuery`    | **response body of the endpoint** (status **<400**) | Throws `Error` on `!res.ok` |
| `useMutation` | `useReactMutation` | same as above                                       | Throws `Error` on `!res.ok` |

Both hooks:

1. **Reject** any 4xx/5xx response _(no union with `{ error : string }`)_.
2. **Infer** the success payload from the endpoint’s Hono types.
3. Expose the full React-Query options object **minus** `queryKey`, `queryFn`, or `mutationFn` (these are provided internally).

---

**Queries**

```tsx
import { api, useQuery } from "@/api";

function UserCard({ id }: { id: string }) {
  const query = useQuery(api.users[":id"].$get, {
    params: { id },
  });

  if (query.isLoading) return <Spinner />;
  if (query.isError) return <Error msg={query.error.message} />;
  return <div>{query.data.name}</div>;
}
```

Notes:

- `params` **must match** the route params for the endpoint; types are enforced. If no params are required, you must provide an empty object
- The returned `data` is already narrowed to the **success payload only**.

---

**Mutations**

```tsx
import { api, useMutation } from "@/api";

function RenameUser({ id }: { id: string }) {
  const utils = useQueryClient(); // from @tanstack/react-query

  const mutation = useMutation(api.users[":id"].$put, {
    onSuccess: (data) => {
      // 👉 data is { id:string; name:string }
      utils.invalidateQueries([getUser, { id }]); // optimistic sync
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const name = new FormData(e.currentTarget).get("name") as string;
        mutation.mutate({ param: { id }, json: { name } });
      }}
    >
      <input name="name" />
      <button disabled={mutation.isPending}>Save</button>
    </form>
  );
}
```

Notes:

- `mutation.mutate({ param, json })` mirrors the endpoint signature.
- On failure, `mutation.error` is the `Error` thrown in the wrapper.

---

**Error Handling Pattern**

```tsx
if (query.error) {
  // query.error.message contains the status code
  return <Alert variant="destructive">{query.error.message}</Alert>;
}
```

Because the hook throws **before** decoding, you never see a partial JSON; the
types stay pure.
