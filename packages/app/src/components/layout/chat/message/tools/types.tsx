import type { AllTools } from "@squash/api/agent/types";
import type { ToolUIPart, UITools } from "ai";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export interface ToolStep<Tools extends UITools, T extends keyof Tools> {
  icon?: (
    part: ToolUIPart<{
      [K in T]: Tools[K];
    }>
  ) => LucideIcon;
  label: (
    part: ToolUIPart<{
      [K in T]: Tools[K];
    }>
  ) => ReactNode;
  content?: (
    part: ToolUIPart<{
      [K in T]: Tools[K];
    }>
  ) => ReactNode;
}

export type ToolSteps<Tools extends UITools = UITools> = {
  [K in keyof Tools]?: ToolStep<Tools, K>;
};

export type ToolPart<T extends keyof AllTools> = ToolUIPart<{
  [K in T]: AllTools[K];
}>;
