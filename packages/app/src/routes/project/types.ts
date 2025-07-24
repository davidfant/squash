import type { api, SuccessBody } from "@/hooks/api";

export type Project = SuccessBody<
  Awaited<ReturnType<(typeof api.projects)[":projectId"]["$get"]>>
>;
