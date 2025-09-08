import type { ModelMessage } from "ai";

export const withCacheBreakpoints = (
  msgs: ModelMessage[],
  maxCount = 4
): ModelMessage[] =>
  msgs.map((m, i) =>
    i >= msgs.length - maxCount
      ? {
          ...m,
          providerOptions: {
            ...m.providerOptions,
            anthropic: { cacheControl: { type: "ephemeral" } },
          },
        }
      : m
  );
