import type { ChatMessage } from "../types";

export function mergeScreenshotAnalysisIntoUserMessages(
  messages: readonly ChatMessage[]
): ChatMessage[] {
  const additions: Record<string, string[]> = {};
  messages.forEach((msg, idx) => {
    msg.parts
      .filter((p) => p.type === "tool-AnalyzeScreenshot")
      .forEach((part) => {
        // Determine which user message gets the output
        let target: ChatMessage | undefined;
        for (let j = idx; j >= 0; j--) {
          const prev = messages[j]!;
          if (prev.role === "user") {
            target = prev;
            break;
          }
        }

        if (target) {
          const arr = additions[target.id as string] ?? [];
          arr.push(
            typeof part.output === "string"
              ? part.output
              : JSON.stringify(part.output)
          );
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
