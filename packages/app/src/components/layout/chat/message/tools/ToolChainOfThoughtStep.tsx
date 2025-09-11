import { ChainOfThoughtStep } from "@/components/ai-elements/chain-of-thought";
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

export const ToolChainOfThoughtStep = <T extends keyof AllTools>({
  part,
  step,
}: {
  part: ToolPart<T>;
  step: ToolStep<AllTools, T>;
}) => (
  <ChainOfThoughtStep
    icon={step.icon?.(part)}
    label={step.label(part)}
    status={part.state === "output-available" ? "complete" : "active"}
  >
    {step.content?.(part)}
  </ChainOfThoughtStep>
);
