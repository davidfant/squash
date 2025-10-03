import { useState } from "react";
import { useStickToBottom } from "use-stick-to-bottom";
import type { ReasoningBlock } from "./groupMessageEvents";

export function ReasoningSummaries({ block }: { block: ReasoningBlock }) {
  const [expanded, setExpanded] = useState(false);
  const { scrollRef, contentRef, scrollToBottom } = useStickToBottom({
    initial: "smooth",
  });

  const content = (() => {
    if (!expanded) {
      const lastTitle = block.summaries.slice(-1)[0]?.title ?? "Thinking...";
      const text = block.streaming ? (
        <span className="text-shimmer">{lastTitle}</span>
      ) : (
        <span>Thought for {block.summaries.length} steps...</span>
      );
      return (
        <p className="font-medium text-sm opacity-50 hover:opacity-100 transition-opacity">
          {text}
        </p>
      );
    }

    return (
      <div ref={scrollRef} className="max-h-[400px] overflow-y-auto space-y-2">
        <div ref={contentRef}>
          {block.summaries.map((summary, index) => (
            <div
              key={index}
              className="space-y-1 text-muted-foreground overflow-hidden"
            >
              <p className="font-medium text-xs">{summary.title}</p>
              <p className="text-xs opacity-70">{summary.content}</p>
            </div>
          ))}
        </div>
      </div>
    );
  })();

  return (
    <div
      className="cursor-pointer overflow-hidden"
      onClick={() => setExpanded(!expanded)}
    >
      {content}
    </div>
  );
}
