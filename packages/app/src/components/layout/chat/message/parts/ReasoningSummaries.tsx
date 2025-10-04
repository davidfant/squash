import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useStickToBottom } from "use-stick-to-bottom";
import type { ReasoningBlock } from "./groupMessageEvents";

const FADE_PX = 32;
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const ScrollView = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const { scrollRef, contentRef } = useStickToBottom({ initial: "instant" });

  const [fadeTop, setFadeTop] = useState(0);
  const [fadeBottom, setFadeBottom] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const update = () => {
      setFadeTop(clamp(el.scrollTop, 0, FADE_PX));
      setFadeBottom(
        clamp(el.scrollHeight - el.scrollTop - el.clientHeight, 0, FADE_PX)
      );
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  const mask = (() => {
    if (!fadeTop && !fadeBottom) return undefined;
    if (fadeTop && fadeBottom) {
      return `linear-gradient(to bottom,
        transparent 0px,
        black ${fadeTop}px,
        black calc(100% - ${fadeBottom}px),
        transparent 100%)`;
    }
    if (fadeTop) {
      return `linear-gradient(to bottom,
        transparent 0px,
        black ${fadeTop}px,
        black 100%)`;
    }
    // fadeBottom only
    return `linear-gradient(to bottom,
      black 0px,
      black calc(100% - ${fadeBottom}px),
      transparent 100%)`;
  })();

  return (
    <div
      ref={scrollRef}
      className={cn("overflow-y-auto", className)}
      style={{ mask, WebkitMask: mask }}
    >
      <div ref={contentRef}>{children}</div>
    </div>
  );
};

export function ReasoningSummaries({ block }: { block: ReasoningBlock }) {
  const [expanded, setExpanded] = useState(false);

  const lastTitle = block.summaries.slice(-1)[0]?.title ?? "Thinking...";

  const collapsedContent = (
    <p className="font-medium text-sm opacity-50 hover:opacity-100 transition-opacity">
      {block.streaming ? (
        <span className="text-shimmer">{lastTitle}</span>
      ) : (
        <span>Thought for {block.summaries.length} steps...</span>
      )}
    </p>
  );

  const expandedContent = (
    <ScrollView className="max-h-[400px]">
      <div className="space-y-2">
        {block.summaries.map((summary, index) => (
          <motion.div
            key={index}
            className="space-y-1 text-muted-foreground overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="font-medium text-xs">{summary.title}</p>
            <p className="text-xs opacity-70">{summary.content}</p>
          </motion.div>
        ))}
      </div>
    </ScrollView>
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
