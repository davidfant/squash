interface FlyMachine {
  id: string;
  name: string;
  state: string;
  region: string;
  instance_id: string;
  private_ip: string;
  created_at: string;
  updated_at: string;
  config: any;
}

export async function createFlyApp(
  appName: string,
  apiKey: string,
  orgSlug: string
) {
  const response = await fetch("https://api.machines.dev/v1/apps", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ app_name: appName, org_slug: orgSlug }),
  });
  if (!response.ok) {
    throw new Error(`Failed to create Fly.io app: ${response.statusText}`);
  }

  await response.json();
  const ipResponse = await fetch("https://api.fly.io/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
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
      variables: { input: { appId: appName, type: "v6" } },
    }),
  });

  const ip: { data: unknown; errors: unknown } = await ipResponse.json();
  if (ip.errors) {
    console.error(
      `Failed to allocate IP for app ${appName}: with status ${
        ipResponse.statusText
      }: ${JSON.stringify(ip)}`
    );
    throw new Error(
      `Failed to allocate IP for app ${appName}: ${ipResponse.statusText}`
    );
  }
}

export function deleteFlyApp(appName: string, apiKey: string) {
  return fetch(`https://api.machines.dev/v1/apps/${appName}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

// Helper function to create Fly.io machine
export async function createFlyMachine({
  appName,
  git,
  apiKey,
}: {
  appName: string;
  git: { url: string; defaultBranch: string; branch: string };
  apiKey: string;
}): Promise<FlyMachine> {
  const response = await fetch(
    `https://api.machines.dev/v1/apps/${appName}/machines`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        config: {
          image: "node:20-alpine",
          size: "performance-2x",
          auto_destroy: false,
          restart: { policy: "no" },
          services: [
            {
              protocol: "tcp",
              internal_port: 3000,
              ports: [
                { port: 80, handlers: ["http"] },
                { port: 443, handlers: ["tls", "http"] },
              ],
              autostop: "stop",
              autostart: true,
            },
          ],
          checks: {
            health: {
              type: "http",
              port: 3000,
              method: "GET",
              path: "/",
              interval: "5s",
              timeout: "5s",
              grace_period: "10s",
            },
          },
          env: {
            PORT: "3000",
            GIT_REPO_DIR: "/app",
            GIT_URL: git.url,
            GIT_BRANCH: git.branch,
            GIT_DEFAULT_BRANCH: git.defaultBranch,
          },
          init: {
            // install and run basic hello world http server
            // entrypoint: ["/bin/sh", "-c", "npx -y http-server -p 3000"],
            entrypoint: [
              "/bin/sh",
              "-c",
              `
                apk update;
                apk add --no-cache git;

                if [ -d $GIT_REPO_DIR ]; then
                  cd $GIT_REPO_DIR;
                  git pull origin $GIT_BRANCH;
                else
                  git clone $GIT_URL $GIT_REPO_DIR;
                  cd $GIT_REPO_DIR;
                fi
                npm install;
                npx vite --host 0.0.0.0 --port 3000;
              `,
            ],
          },
          stop_config: { timeout: 10, signal: "SIGTERM" },
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to create Fly.io machine: ${response.statusText}`);
  }

  return response.json() as Promise<FlyMachine>;
}
