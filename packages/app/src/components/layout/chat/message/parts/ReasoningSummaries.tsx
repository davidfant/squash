import { FadingScrollView } from "@/components/blocks/fading-scroll-view";
import { motion } from "framer-motion";
import { useState } from "react";
import { useStickToBottom } from "use-stick-to-bottom";
import type { ReasoningBlock } from "./groupMessageEvents";

export function ReasoningSummaries({ block }: { block: ReasoningBlock }) {
  const [expanded, setExpanded] = useState(false);
  const { scrollRef, contentRef } = useStickToBottom({ initial: "instant" });

  const lastTitle = block.summaries.slice(-1)[0]?.title ?? "Thinking...";

  const collapsedContent = (
    <p className="font-medium text-sm opacity-50 hover:opacity-100 transition-opacity">
      {block.streaming ? (
        <span className="shimmer">{lastTitle}</span>
      ) : (
        <span>Thought for {block.summaries.length} steps...</span>
      )}
    </p>
  );

  const expandedContent = (
    <FadingScrollView
      ref={scrollRef}
      className="max-h-[256px] scrollbar-hidden"
    >
      <div className="space-y-2" ref={contentRef}>
        {block.summaries.map((summary, index) => (
          <motion.div
            key={index}
            className="space-y-1 text-muted-foreground overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="font-medium text-sm">{summary.title}</p>
            <p className="text-sm opacity-70">{summary.content}</p>
          </motion.div>
        ))}
      </div>
    </FadingScrollView>
  );

  return (
    <div
      className="cursor-pointer overflow-hidden"
      onClick={() => setExpanded(!expanded)}
    >
      <motion.div
        initial={false}
        animate={{ height: expanded ? 0 : "auto", opacity: expanded ? 0 : 1 }}
      >
        {collapsedContent}
      </motion.div>
      <motion.div
        initial={false}
        animate={{ height: expanded ? "auto" : 0, opacity: expanded ? 1 : 0 }}
      >
        {expandedContent}
      </motion.div>
    </div>
  );
}
