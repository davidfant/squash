import { logger } from "@/lib/logger";

export class FlyAPIError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.code = code;
  }
}

async function flyFetchGraphQL<T>({
  query,
  variables,
  accessToken,
}: {
  query: string;
  variables: Record<string, unknown>;
  accessToken: string;
}) {
  const res = await fetch("https://api.fly.io/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  const data = await res.json();
  return data as {
    data: T | null;
    errors: Array<{ message: string }> | null;
  };
}

async function flyFetch(
  path: string,
  accessToken: string,
  init: RequestInit = {}
) {
  let res: Response;
  try {
    res = await fetch(`https://api.machines.dev/v1${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : JSON.stringify(error);
    logger.error("Failed to reach Fly.io API", {
      path,
      method: init.method,
      error: message,
    });
    throw new FlyAPIError(`Request to ${path} failed: ${message}`, 500);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    logger.error("Fly.io API responded with an error", {
      path,
      method: init.method,
      status: res.status,
      statusText: res.statusText,
      body: text,
    });
    throw new FlyAPIError(
      `Request to ${path} failed with status ${res.status} ${res.statusText}: ${text}`,
      res.status
    );
  }
  return res;
}

async function flyFetchJson<T>(
  path: string,
  accessToken: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await flyFetch(path, accessToken, init);
  return (await res.json()) as T;
}

export async function createApp({
  appId,
  accessToken,
  orgSlug,
}: {
  appId: string;
  accessToken: string;
  orgSlug: string;
}) {
  await flyFetchJson("/apps", accessToken, {
    method: "POST",
    body: JSON.stringify({ app_name: appId, org_slug: orgSlug }),
  });
}

export const createMachine = ({
  appId,
  accessToken,
  image,
  port,
}: {
  appId: string;
  accessToken: string;
  image: string;
  port: number;
}) =>
  flyFetchJson<{ id: string }>(`/apps/${appId}/machines`, accessToken, {
    method: "POST",
    body: JSON.stringify({
      config: {
        image,
        guest: { cpu_kind: "shared", cpus: 2, memory_mb: 1024 },
        auto_destroy: false,
        restart: { policy: "no" },
        services: [
          {
            protocol: "tcp",
            internal_port: port,
            ports: [
              { port: 80, handlers: ["http"] },
              { port: 443, handlers: ["tls", "http"] },
            ],
            autostop: "stop",
            autostart: true,
          },
        ],
        init: {
          entrypoint: [
            "sh",
            "-lc",
            "sysctl -w fs.inotify.max_user_watches=262144 && sleep infinity",
          ],
        },
      },
    }),
  });

export async function deleteApp(appId: string, accessToken: string) {
  await flyFetch(`/apps/${appId}?force=true`, accessToken, {
    method: "DELETE",
  });
}

export async function allocateIPAddress(appId: string, accessToken: string) {
  const response = await flyFetchGraphQL<{
    allocateIpAddress: { ipAddress: { address: string } };
  }>({
    query: `
      mutation($input: AllocateIPAddressInput!) {
        allocateIpAddress(input: $input) {
          ipAddress {
            address
            type
            region
          }
        }
      }
    `,
    variables: { input: { appId, type: "v6" } },
    accessToken,
  });

  if (response.errors) {
    console.error(
      `Failed to allocate IP for app ${appId}: ${JSON.stringify(
        response.errors
      )}`
    );
    throw new Error(
      `Failed to allocate IP for app ${appId}: ${JSON.stringify(
        response.errors
      )}`
    );
  }
}

export async function hasAllocatedIpAddress(
  appId: string,
  accessToken: string
) {
  const ipResponse = await flyFetchGraphQL<{
    app: { ipAddresses: { totalCount: number } };
  }>({
    query: `
      query($appId: String!) {
        app(id: $appId) {
          ipAddresses {
            totalCount
          }
        }
      }
    `,
    variables: { appId },
    accessToken,
  });

  if (ipResponse.errors) {
    console.error(
      `Failed to check IP for app ${appId}: ${JSON.stringify(
        ipResponse.errors
      )}`
    );
    throw new Error(
      `Failed to check IP for app ${appId}: ${JSON.stringify(
        ipResponse.errors
      )}`
    );
  }
  return !!ipResponse.data?.app.ipAddresses.totalCount;
}

export async function isAppCreated(appId: string, accessToken: string) {
  const res = await flyFetchGraphQL<{
    app: { id: string; machines: { totalCount: number } } | null;
  }>({
    query: `
      query($appId: String!) {
        app(id: $appId) {
          id
          machines {
            totalCount
          }
        }
      }
    `,
    variables: { appId },
    accessToken,
  });

  return {
    app: !!res.data?.app,
    machine: !!res.data?.app?.machines.totalCount,
  };
}

export async function startMachine(
  appId: string,
  machineId: string,
  accessToken: string
) {
  await flyFetch(`/apps/${appId}/machines/${machineId}/start`, accessToken, {
    method: "POST",
  });
}

export async function getMachineState(
  appId: string,
  machineId: string,
  accessToken: string
) {
  const res = await flyFetchJson<{ state: "started" | string }>(
    `/apps/${appId}/machines/${machineId}`,
    accessToken
  );
  return res.state;
}
