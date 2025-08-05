import type { ModelMessage } from "ai";

export function withCacheBreakpoints(
  msgs: ModelMessage[],
  maxCount = 4
): ModelMessage[] {
  const result = [...msgs];
  const breakpoints: number[] = [];

  // Scan backwards, pick last relevant ones
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i]!;
    const isStatic = m.role === "system" || m.role === "tool";
    const isAnchor = m.role === "assistant";
    if (isStatic || isAnchor) {
      breakpoints.push(i);
      if (breakpoints.length >= maxCount) break;
    }
  }

  for (const idx of breakpoints) {
    result[idx]!.providerOptions = {
      ...result[idx]!.providerOptions,
      anthropic: { cacheControl: { type: "ephemeral" } },
    };
  }

  return result;
}
