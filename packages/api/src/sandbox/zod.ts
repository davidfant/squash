import z from "zod";
import type { Sandbox } from "./types";

const zSandboxSnapshotTaskBase = z.object({
  id: z.string(),
  title: z.string(),
  dependsOn: z.string().array().optional(),
}) satisfies z.ZodType<Sandbox.Snapshot.Task.Base>;

const zSandboxSnapshotCommandTask = zSandboxSnapshotTaskBase.extend({
  type: z.literal("command"),
  command: z.string(),
  args: z.string().array().optional(),
}) satisfies z.ZodType<Sandbox.Snapshot.Task.Command>;

const zSandboxSnapshotFunctionTask = zSandboxSnapshotTaskBase.extend({
  type: z.literal("function"),
  function: z.function(),
}) satisfies z.ZodType<Sandbox.Snapshot.Task.Function>;

const zSandboxSnapshotTask = z.union([
  zSandboxSnapshotCommandTask,
  zSandboxSnapshotFunctionTask,
]) satisfies z.ZodType<Sandbox.Snapshot.Task.Any>;

const zSandboxSnapshotBaseConfig = z.object({
  port: z.number(),
  cwd: z.string(),
  env: z.record(z.string(), z.string()),
  tasks: z.object({
    install: z.array(zSandboxSnapshotTask) as unknown as z.ZodType<
      Sandbox.Snapshot.Task.Any[]
    >,
    dev: zSandboxSnapshotCommandTask,
    build: z.array(zSandboxSnapshotTask) as unknown as z.ZodType<
      Sandbox.Snapshot.Task.Any[]
    >,
  }),
}) satisfies z.ZodType<Sandbox.Snapshot.Config.Base>;

export const zSandboxSnapshotConfig = z.union([
  zSandboxSnapshotBaseConfig.extend({
    type: z.literal("docker"),
    image: z.string(),
  }),
  zSandboxSnapshotBaseConfig.extend({ type: z.literal("cloudflare") }),
  zSandboxSnapshotBaseConfig.extend({ type: z.literal("vercel") }),
  zSandboxSnapshotBaseConfig.extend({
    type: z.literal("daytona"),
    snapshot: z.string(),
  }),
]) satisfies z.ZodType<Sandbox.Snapshot.Config.Any>;
