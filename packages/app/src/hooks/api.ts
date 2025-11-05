import { useAuth } from "@clerk/clerk-react";
import type { AppType } from "@squashai/api";
import {
  type QueryKey,
  type UseMutationOptions,
  type UseQueryOptions,
  useMutation as useReactMutation,
  useQuery as useReactQuery,
} from "@tanstack/react-query";
import {
  type ClientRequestOptions,
  type ClientResponse,
  hc,
} from "hono/client";
import type {
  ClientErrorStatusCode,
  ServerErrorStatusCode,
} from "hono/utils/http-status";

export const api = hc<AppType>(import.meta.env.VITE_API_URL);

export type SuccessBody<R> = R extends ClientResponse<infer B, infer S, any>
  ? S extends ClientErrorStatusCode | ServerErrorStatusCode
    ? never
    : B
  : never;

export type QueryOutput<
  Fn extends (a: { param: any }, opts: ClientRequestOptions) => Promise<any>
> = SuccessBody<Awaited<ReturnType<Fn>>>;

export function useAuthHeaders() {
  const { getToken } = useAuth();
  return () =>
    getToken().then(
      (t): Record<string, string> => (t ? { Authorization: `Bearer ${t}` } : {})
    );
}

export function useQuery<
  Fn extends (a: { param: any }, opts: ClientRequestOptions) => Promise<any>,
  Params = Parameters<Fn>[0] extends { param: infer P } ? P : never,
  Output = QueryOutput<Fn>
>(
  query: Fn,
  options: Omit<UseQueryOptions<Output>, "queryKey" | "queryFn"> & {
    params: Params;
    queryKey?: QueryKey;
  }
) {
  const headers = useAuthHeaders();
  return useReactQuery({
    ...options,
    // stable key: function ref + params + optional extras
    queryKey: [query, options.params, ...(options.queryKey ?? [])],
    queryFn: async () => {
      const res = await query({ param: options.params }, { headers });
      if (!res.ok) throw new Error(`Query failed (${res.status})`);
      return res.json() as Output; // ← no `{ error: string }` union
    },
  });
}

export function useMutation<
  Fn extends (
    arg: { param: any; json: any },
    opts: ClientRequestOptions
  ) => Promise<any>,
  Output = SuccessBody<Awaited<ReturnType<Fn>>>
>(
  mutation: Fn,
  options?: Omit<
    UseMutationOptions<Output, Error, Parameters<Fn>[0]>,
    "mutationFn"
  >
) {
  const headers = useAuthHeaders();
  return useReactMutation({
    mutationFn: async (input: Parameters<Fn>[0]) => {
      const res = await mutation(input, { headers });
      if (!res.ok) throw new Error(`Mutation failed (${res.status})`);
      return res.json() as Output; // typed as the success body only
    },
    ...options,
  });
}
