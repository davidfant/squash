import type { RepoSnapshot } from "@/database/schema/repos";
import { traceable } from "langsmith/traceable";
import { logger } from "../logger";
import { FlyAPIError, flyFetch, flyFetchJson } from "./util";

interface FlyMachineCheck {
  name: string;
  status: "passing" | "warning" | "critical" | string;
  output?: string;
  updated_at?: string;
}

type FlyMachineStatus =
  | "created"
  | "started"
  | "stopped"
  | "suspended"
  | string;

interface FlyMachine {
  id: string;
  name: string;
  state: FlyMachineStatus;
  region: string;
  instance_id: string;
  checks: FlyMachineCheck[];
  private_ip: string;
  created_at: string;
  updated_at: string;
  config: any;
}

interface FlyVolume {
  id: string;
  name: string;
  region: string;
  size_gb: number;
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

export const createVolume = (
  appId: string,
  apiKey: string,
  region: string,
  name = "repo_data",
  sizeGb = 1
) =>
  flyFetchJson<FlyVolume>(`/apps/${appId}/volumes`, apiKey, {
    method: "POST",
    body: JSON.stringify({ name, region, size_gb: sizeGb }),
  });

export async function createMachine({
  appId,
  git,
  auth,
  accessToken,
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
  accessToken: string;
  snapshot: RepoSnapshot;
}) {
  const region = "iad";
  const volume = await createVolume(appId, accessToken, region);
  return flyFetchJson<FlyMachine>(`/apps/${appId}/machines`, accessToken, {
    method: "POST",
    body: JSON.stringify({
      region: volume.region,
      config: {
        image: snapshot.image,
        // guest: { cpu_kind: "shared", cpus: 2, memory_mb: 1024 },
        guest: { cpu_kind: "shared", cpus: 2, memory_mb: 2048 },
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
          WORKDIR: git.workdir,
          GIT_REPO_URL: git.url,
          GIT_BRANCH: git.branch,
          GITHUB_USERNAME: auth.github?.username,
          GITHUB_PASSWORD: auth.github?.password,

          AWS_ACCESS_KEY_ID: auth.aws?.accessKeyId,
          AWS_SECRET_ACCESS_KEY: auth.aws?.secretAccessKey,
          AWS_ENDPOINT_URL_S3: auth.aws?.endpointUrl,
          AWS_REGION: auth.aws?.region,
        },
        mounts: [{ volume: volume.id, path: git.workdir, name: volume.name }],
        init: {
          entrypoint: [
            "sh",
            "-lc",
            `
              set -e

              ${snapshot.cmd.prepare ?? ""}

              cd $WORKDIR

              if [ -n "$GITHUB_USERNAME" ] && [ -n "$GITHUB_PASSWORD" ]; then
                echo "Configuring git credential helper..."
                git config --global credential.helper store
                printf "https://%s:%s@github.com\n" "$GITHUB_USERNAME" "$GITHUB_PASSWORD" > ~/.git-credentials
              fi

              if [ ! -d ".git" ]; then
                echo "Initializing git repo in $WORKDIR..."
                git init
                git remote add origin "$GIT_REPO_URL"
  
                # Get the default branch from the remote (works for main/master or others)
                DEFAULT_BRANCH=$(git ls-remote --symref origin HEAD | awk '/^ref:/ {print $2}' | sed 's|refs/heads/||')
  
                echo "Pulling default branch ($DEFAULT_BRANCH) from $GIT_REPO_URL..."
                git fetch origin "$DEFAULT_BRANCH"
                git reset --hard "origin/$DEFAULT_BRANCH"
  
                echo "Creating new branch $GIT_BRANCH..."
                git checkout -b "$GIT_BRANCH"
              #else
              #  echo "Repo already initialized. Pulling latest changes..."
              #  git pull --ff-only
              fi

              ${snapshot.cmd.entrypoint}
            `,
          ],
          // entrypoint: ["/bin/sh", "-c", snapshot.entrypoint],
        },
        stop_config: { timeout: 10, signal: "SIGTERM" },
      },
    }),
  });
}

function isHealthy(machine: FlyMachine): boolean {
  const running = machine.state === "started";
  const checks = machine.checks ?? [];
  const checksPassing =
    checks.length === 0 || checks.every((c) => c.status === "passing");
  return running && checksPassing;
}

export const waitForMachineHealthy = ({
  appId,
  machineId,
  accessToken,
  abortSignal,
  timeoutMs = 5 * 60_000,
  pollMs = 2_000,
  onCheck,
}: {
  appId: string;
  machineId: string;
  accessToken: string;
  abortSignal: AbortSignal;
  timeoutMs?: number;
  pollMs?: number;
  onCheck?: (status: FlyMachineStatus, checks: FlyMachineCheck[]) => void;
}) =>
  traceable(
    async (_: { appId: string; machineId: string }) => {
      logger.info("Waiting for machine to become healthy", {
        appId,
        machineId,
      });

      const getDetails = traceable(
        () =>
          flyFetchJson<FlyMachine>(
            `/apps/${appId}/machines/${machineId}`,
            accessToken
          ),
        { name: "Get machine details" }
      );

      const machine = await getDetails();
      onCheck?.(machine.state, machine.checks);
      if (isHealthy(machine)) return machine;

      if (["stopped", "suspended"].includes(machine.state)) {
        logger.debug("Machine is stopped or suspended, starting it", {
          appId,
          machineId,
        });
        await traceable(
          () =>
            flyFetchJson(
              `/apps/${appId}/machines/${machineId}/start`,
              accessToken,
              { method: "POST" }
            ),
          { name: "Start machine" }
        )();
      }

      const startTime = Date.now();
      while (!abortSignal?.aborted) {
        let machine: FlyMachine | undefined;
        try {
          machine = await getDetails();
          logger.debug("Checking machine health", {
            appId,
            machineId,
            state: machine.state,
            checks: machine.checks,
          });
          onCheck?.(machine.state, machine.checks);
          if (isHealthy(machine)) return machine;
          if (machine.state === "stopped") {
            logger.debug("Machine stopped, aborting", { appId, machineId });
          }
        } catch (e) {
          logger.warn(
            `Failed to fetch machine ${appId}/${machineId} after start: ${
              (e as Error).message
            }`
          );

          if (e instanceof FlyAPIError && e.code === 404) {
            throw new Error(
              `Machine ${appId}/${machineId} not found. It may have been deleted.`
            );
          }
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
    },
    { name: "Wait for machine to become healthy" }
  )({ appId, machineId });
