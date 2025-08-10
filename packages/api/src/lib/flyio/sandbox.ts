import type { RepoSnapshot } from "@/database/schema/repos";
import { flyFetch, flyFetchJson } from "./util";

interface FlyMachineCheck {
  name: string;
  status: "passing" | "warning" | "critical" | string;
  output?: string;
  updated_at?: string;
}

interface FlyMachine {
  id: string;
  name: string;
  state: "created" | "stopped" | "suspended" | string;
  region: string;
  instance_id: string;
  checks: FlyMachineCheck[];
  private_ip: string;
  created_at: string;
  updated_at: string;
  config: any;
}

export async function createApp(
  appId: string,
  apiKey: string,
  orgSlug: string
) {
  await flyFetchJson("/apps", apiKey, {
    method: "POST",
    body: JSON.stringify({ app_name: appId, org_slug: orgSlug }),
  });

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
      variables: { input: { appId: appId, type: "v6" } },
    }),
  });

  const ip: { data: unknown; errors: unknown } = await ipResponse.json();
  if (ip.errors) {
    console.error(
      `Failed to allocate IP for app ${appId}: with status ${
        ipResponse.statusText
      }: ${JSON.stringify(ip)}`
    );
    throw new Error(
      `Failed to allocate IP for app ${appId}: ${ipResponse.statusText}`
    );
  }
}

export const deleteApp = (appName: string, apiKey: string) =>
  flyFetch(`/apps/${appName}?force=true`, apiKey, { method: "DELETE" });

export const createMachine = ({
  appId,
  git,
  auth,
  apiKey,
  snapshot,
}: {
  appId: string;
  git: { url: string; branch: string; workdir: string };
  auth: {
    github?: { username: string; password: string };
    aws?: {
      accessKeyId: string;
      secretAccessKey: string;
      endpointUrl: string;
      region: "auto";
    };
  };
  apiKey: string;
  snapshot: RepoSnapshot;
}) =>
  flyFetchJson<FlyMachine>(`/apps/${appId}/machines`, apiKey, {
    method: "POST",
    body: JSON.stringify({
      config: {
        image: snapshot.image,
        guest: { cpu_kind: "shared", cpus: 2, memory_mb: 1024 },
        // size: "performance-1x",
        auto_destroy: false,
        restart: { policy: "no" },
        services: [
          {
            protocol: "tcp",
            internal_port: snapshot.port,
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
            port: snapshot.port,
            method: "GET",
            path: "/",
            interval: "2s",
            timeout: "2s",
            // grace_period: "1s",
          },
        },
        env: {
          PORT: snapshot.port.toString(),
          GIT_REPO_DIR: git.workdir,
          GIT_REPO_URL: git.url,
          GIT_BRANCH: git.branch,
          GITHUB_USERNAME: auth.github?.username,
          GITHUB_PASSWORD: auth.github?.password,

          AWS_ACCESS_KEY_ID: auth.aws?.accessKeyId,
          AWS_SECRET_ACCESS_KEY: auth.aws?.secretAccessKey,
          AWS_ENDPOINT_URL_S3: auth.aws?.endpointUrl,
          AWS_REGION: auth.aws?.region,
        },
        init: {
          // entrypoint: [
          //   "/bin/sh",
          //   "-c",
          //   `
          //       set -e;

          //       apk update;
          //       apk add --no-cache git;

          //       corepack enable;
          //       corepack prepare pnpm@10.0.0 --activate;

          //       git config --global credential.helper store;
          //       printf "protocol=https\nhost=github.com\nusername=$GITHUB_USERNAME\npassword=$GITHUB_PASSWORD\n" | git credential approve;

          //       if [ -d $GIT_REPO_DIR ]; then
          //         cd $GIT_REPO_DIR;
          //         # git pull origin $GIT_BRANCH;
          //       else
          //         git clone $GIT_URL $GIT_REPO_DIR;
          //         cd $GIT_REPO_DIR;
          //       fi
          //       ${snapshot.entrypoint};
          //     `,
          // ],
          entrypoint: [
            "sh",
            "-lc",
            `
              cd "$GIT_REPO_DIR"

              if [ ! -d ".git" ]; then
                echo "Initializing git repo in $GIT_REPO_DIR..."
                git init
                git remote add origin "$GIT_REPO_URL"

                # Get the default branch from the remote (works for main/master or others)
                DEFAULT_BRANCH=$(git ls-remote --symref origin HEAD | awk '/^ref:/ {print $2}' | sed 's|refs/heads/||')

                echo "Pulling default branch ($DEFAULT_BRANCH) from $GIT_REPO_URL..."
                git fetch origin "$DEFAULT_BRANCH"
                git reset --hard "origin/$DEFAULT_BRANCH"

                echo "Creating new branch $GIT_BRANCH..."
                git checkout -b "$GIT_BRANCH"
              else
                echo "Repo already initialized. Pulling latest changes..."
                git pull --ff-only
              fi

              ${snapshot.entrypoint};
            `,
          ],
          // entrypoint: ["/bin/sh", "-c", snapshot.entrypoint],
        },
        stop_config: { timeout: 10, signal: "SIGTERM" },
      },
    }),
  });

function isHealthy(machine: FlyMachine): boolean {
  const running = machine.state === "started";
  const checks = machine.checks ?? [];
  const checksPassing =
    checks.length === 0 || checks.every((c) => c.status === "passing");
  return running && checksPassing;
}

export async function waitForMachineHealthy(
  appId: string,
  machineId: string,
  apiKey: string,
  timeoutMs = 5 * 60_000,
  pollMs = 2_000
) {
  const machine = await flyFetchJson<FlyMachine>(
    `/apps/${appId}/machines/${machineId}`,
    apiKey
  );
  if (isHealthy(machine)) return machine;

  if (["stopped", "suspended"].includes(machine.state)) {
    await flyFetchJson(`/apps/${appId}/machines/${machineId}/start`, apiKey, {
      method: "POST",
    });
  }

  const startTime = Date.now();
  while (true) {
    let machine: FlyMachine | undefined;
    try {
      machine = await flyFetchJson<FlyMachine>(
        `/apps/${appId}/machines/${machineId}`,
        apiKey
      );

      if (isHealthy(machine)) return machine;
    } catch (e) {
      console.warn(
        `Failed to fetch machine ${appId}/${machineId} after start: ${
          (e as Error).message
        }`
      );
    }

    if (Date.now() - startTime > timeoutMs) {
      const summary = (machine?.checks ?? [])
        .map((c) => `${c.name}:${c.status}`)
        .join(", ");
      throw new Error(
        `Timed out waiting for machine ${machineId} to become healthy. ` +
          `state=${machine?.state} checks=[${summary}]`
      );
    }

    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}
