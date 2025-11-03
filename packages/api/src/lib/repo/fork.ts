import { logger } from "@/lib/logger";
import type { Sandbox } from "@/sandbox/types";
import { randomUUID } from "crypto";

interface TemplateDefinition {
  readonly sourcePrefix: string;
  readonly defaultBranch: string;
  readonly snapshot: Sandbox.Snapshot.Config.Any;
}

const templates = {
  "base-vite-trpc-cloudflare-worker-ts": {
    sourcePrefix: "templates/base-vite-trpc-cloudflare-worker-ts",
    // defaultBranch: "master",
    defaultBranch: "master",
    snapshot: {
      type: "daytona",
      snapshot: "base-vite-trpc-cloudflare-worker-ts:v0.0.2",
      port: 5173,
      cwd: "/repo",
      envFile: ".env",
      tasks: {
        install: [
          {
            id: "install",
            title: "Install dependencies",
            type: "command",
            command: "pnpm",
            args: ["install"],
          },
        ],
        dev: {
          id: "dev",
          title: "Start development server",
          type: "command",
          // command: "pnpm",
          // args: ["dev"],
          command: "sh",
          args: ["-c", "pnpm dev 2>&1 | tee debug.log"],
        },
        build: [
          {
            id: "build",
            title: "Build",
            type: "command",
            command: "pnpm",
            args: ["build"],
          },
        ],
      },
      // build: { type: "static", dir: "dist" },
      build: { type: "cloudflare-worker" },
    },
  },
} as const satisfies Record<string, TemplateDefinition>;

export type TemplateName = keyof typeof templates;

export const TEMPLATE_NAMES = Object.keys(templates) as [
  TemplateName,
  ...TemplateName[]
];

interface ForkResult {
  id: string;
  gitUrl: string;
  defaultBranch: string;
  snapshot: Sandbox.Snapshot.Config.Any;
}

async function copyObject(
  env: CloudflareBindings,
  sourceKey: string,
  destinationKey: string
) {
  const source = await env.REPOS.get(sourceKey);
  logger.debug("Copying object", { sourceKey, destinationKey, source });
  if (!source) {
    throw new Error(`Failed to read source object ${sourceKey}`);
  }
  await env.REPOS.put(destinationKey, await source.arrayBuffer(), {
    httpMetadata: source.httpMetadata,
    customMetadata: source.customMetadata,
  });
}

export async function forkTemplate(
  env: CloudflareBindings,
  name: TemplateName
): Promise<ForkResult> {
  const template = templates[name];
  return forkRepo(env, {
    gitUrl: `s3://repos/${template.sourcePrefix}`,
    defaultBranch: template.defaultBranch,
    snapshot: template.snapshot,
  });
}

export async function forkRepo(
  env: CloudflareBindings,
  repo: {
    gitUrl: string;
    defaultBranch: string;
    snapshot: Sandbox.Snapshot.Config.Any;
  }
): Promise<ForkResult> {
  const repoId = randomUUID();

  if (!repo.gitUrl.startsWith("s3://repos/")) {
    throw new Error(`Invalid git url: ${repo.gitUrl}`);
  }

  const sourcePrefix = repo.gitUrl.slice("s3://repos/".length);
  const destinationPrefix = `from-template/${repoId}`;
  const defaultBranchPrefix = `${sourcePrefix}/refs/heads/${repo.defaultBranch}/`;

  const listed = await env.REPOS.list({ prefix: defaultBranchPrefix });
  if (!listed.objects.length) {
    throw new Error(
      `Repo at ${repo.gitUrl} is missing refs/heads/${repo.defaultBranch} bundles at ${defaultBranchPrefix}`
    );
  }

  const latestBundle = listed.objects.reduce((latest, current) => {
    if (!latest) return current;
    return current.uploaded.getTime() > latest.uploaded.getTime()
      ? current
      : latest;
  });

  await Promise.all([
    copyObject(
      env,
      latestBundle.key,
      `${destinationPrefix}/refs/heads/${repo.defaultBranch}/${latestBundle.key
        .split("/")
        .pop()!}`
    ),
    copyObject(env, `${sourcePrefix}/HEAD`, `${destinationPrefix}/HEAD`),
  ]);

  return {
    id: repoId,
    gitUrl: `s3://repos/${destinationPrefix}`,
    defaultBranch: repo.defaultBranch,
    snapshot: repo.snapshot,
  };
}
