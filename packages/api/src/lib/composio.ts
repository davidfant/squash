import { env } from "cloudflare:workers";
import { randomUUID } from "node:crypto";

async function fetchJSON<T>(url: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`${url} → ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export const createProject = (repoId: string) =>
  fetchJSON<{ id: string; name: string; api_key: string }>(
    `https://backend.composio.dev/api/v3/org/owner/project/new`,
    {
      method: "POST",
      headers: {
        "x-org-api-key": env.COMPOSIO_ORGANIZATION_ACCESS_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: repoId, should_create_api_key: true }),
    }
  );

export async function createEnvVariables(projectId: string) {
  const project = await createProject(projectId);
  return {
    COMPOSIO_PROJECT_ID: project.id,
    COMPOSIO_API_KEY: project.api_key,
    COMPOSIO_PLAYGROUND_USER_ID: `playground-${randomUUID()}`,
  };
}
