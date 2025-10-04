import { api, type QueryOutput } from "@/hooks/api";

export type Branch = QueryOutput<(typeof api.branches)[":branchId"]["$get"]>;
