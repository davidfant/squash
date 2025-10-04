import type { ChatMessage } from "../types";

export function mergeScreenshotAnalysisIntoUserMessages(
  messages: readonly ChatMessage[]
): ChatMessage[] {
  const additions: Record<string, string[]> = {};
  messages.forEach((msg, idx) => {
    msg.parts
      .filter((p) => p.type === "tool-AnalyzeScreenshot")
      .forEach((part) => {
        const target = messages
          .slice(0, idx)
          .findLast((m) => m.role === "user");

        if (target && part.output) {
          const arr = additions[target.id as string] ?? [];
          arr.push(part.output);
          additions[target.id as string] = arr;
        }
      });
  });

  return messages.map((msg) => ({
    ...msg,
    parts: [
      ...msg.parts,
      ...(additions[msg.id] ?? []).map((text) => ({
        type: "text" as const,
        text,
      })),
    ],
  }));
}
