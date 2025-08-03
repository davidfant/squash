import type { api, QueryOutput } from "@/hooks/api";

export type Branch = QueryOutput<
  (typeof api.repos.branches)[":branchId"]["$get"]
>;
