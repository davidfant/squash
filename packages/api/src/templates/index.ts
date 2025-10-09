import type { Sandbox } from "@/sandbox/types";
import { randomUUID } from "crypto";

interface TemplateDefinition {
  readonly sourcePrefix: string;
  readonly defaultBranch: string;
  readonly snapshot: Sandbox.Snapshot.Config.Daytona;
}

const daytonaTasks = {
  install: [
    {
      id: "install",
      title: "Install dependencies",
      type: "command" as const,
      command: "pnpm",
      args: ["install"],
    },
  ],
  dev: {
    id: "dev",
    title: "Start development server",
    type: "command" as const,
    command: "pnpm",
    args: ["dev"],
  },
  build: [
    {
      id: "build",
      title: "Build",
      type: "command" as const,
      command: "pnpm",
      args: ["build"],
    },
  ],
} as const satisfies Sandbox.Snapshot.Config.Daytona["tasks"];

const templates = {
  "base-template": {
    sourcePrefix: "templates/base-vite-ts",
    defaultBranch: "master",
    snapshot: {
      type: "daytona",
      snapshot: "base-vite-ts:v0.0.4",
      port: 5173,
      cwd: "/repo",
      env: {},
      tasks: daytonaTasks,
      build: { type: "static", dir: "dist" },
    },
  },
  "base-leet-ts-version-004": {
    sourcePrefix: "templates/base-leet-ts-version-004",
    defaultBranch: "master",
    snapshot: {
      type: "daytona",
      snapshot: "base-leet-ts:version-004",
      port: 5173,
      cwd: "/repo",
      env: {},
      tasks: daytonaTasks,
      build: { type: "static", dir: "dist" },
    },
  },
} as const satisfies Record<string, TemplateDefinition>;

export type TemplateName = keyof typeof templates;

export const TEMPLATE_NAMES = Object.keys(templates) as TemplateName[];

export function resolveTemplate(name: TemplateName): TemplateDefinition {
  return templates[name];
}

interface ForkResult {
  id: string;
  gitUrl: string;
  defaultBranch: string;
  snapshot: Sandbox.Snapshot.Config.Daytona;
}

export async function forkTemplate(
  env: CloudflareBindings,
  name: TemplateName
): Promise<ForkResult> {
  const template = resolveTemplate(name);
  const repoId = randomUUID();
  const destinationPrefix = `repos/${repoId}/`;
  const sourcePrefix = template.sourcePrefix.replace(/\/?$/, "/");
  const masterPrefix = `${sourcePrefix}refs/heads/master/`;

  const listed = await env.REPOS.list({ prefix: masterPrefix });
  if (!listed.objects.length) {
    throw new Error(
      `Template ${name} is missing refs/heads/master bundles at ${masterPrefix}`
    );
  }

  const latestBundle = listed.objects.reduce((latest, current) => {
    if (!latest) return current;
    return current.uploaded.getTime() > latest.uploaded.getTime()
      ? current
      : latest;
  });

  const bundleObject = await env.REPOS.get(latestBundle.key);
  if (!bundleObject) {
    throw new Error(`Failed to read bundle ${latestBundle.key}`);
  }

  const bundleBody = await bundleObject.arrayBuffer();
  const bundleKey = `${destinationPrefix}refs/heads/master/${latestBundle.key
    .split("/")
    .pop()!}`;
  await env.REPOS.put(bundleKey, bundleBody, {
    httpMetadata: bundleObject.httpMetadata,
    customMetadata: bundleObject.customMetadata,
  });

  const headKey = `${sourcePrefix}HEAD`;
  const headObject = await env.REPOS.get(headKey);
  if (!headObject) {
    throw new Error(`Failed to read HEAD file for template ${name}`);
  }

  await env.REPOS.put(`${destinationPrefix}HEAD`, await headObject.text(), {
    httpMetadata: headObject.httpMetadata,
    customMetadata: headObject.customMetadata,
  });

  return {
    id: repoId,
    gitUrl: `s3://repos/${destinationPrefix.slice(0, -1)}`,
    defaultBranch: template.defaultBranch,
    snapshot: template.snapshot,
  };
}
