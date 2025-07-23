import { useChat } from "@/components/layout/chat/context";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import {
  addEventListener,
  postMessage,
  type InlineCommentMessage,
} from "@lp/dev-tools/messaging";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useProjectContext } from "./context";
import { InlineEditCommand } from "./InlineEditCommand";

export function ProjectPreview() {
  const { selectedPage, screenSize } = useProjectContext();
  const { sendMessage } = useChat();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isPointAndClick, setIsPointAndClick] = useState(false);
  const [comment, setComment] = useState<
    (InlineCommentMessage & { screenshot?: string }) | null
  >(null);

  useEffect(() => {
    postMessage(
      { type: "InlineCommentSettings", enabled: isPointAndClick },
      "*",
      iframeRef.current?.contentWindow ?? null
    );

    if (isPointAndClick) {
      const unsubInlineComment = addEventListener("InlineComment", setComment);
      const unsubInlineCommentScreenshot = addEventListener(
        "InlineCommentScreenshot",
        (c) =>
          setComment((p) =>
            p?.id === c.id ? { ...p, screenshot: c.screenshot } : p
          )
      );
      return () => {
        unsubInlineComment();
        unsubInlineCommentScreenshot();
      };
    } else {
      setComment(null);
    }
  }, [isPointAndClick]);

  if (!selectedPage) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No page selected
      </div>
    );
  }

  // Define width classes based on screen size
  const getPreviewWidth = () => {
    switch (screenSize) {
      case "mobile":
        return "w-[375px]"; // Mobile width
      case "tablet":
        return "w-[768px]"; // Tablet width
      case "desktop":
        return "w-full";
    }
  };

  return (
    <div className="relative h-full">
      <iframe
        ref={iframeRef}
        src="http://localhost:5174"
        className={cn(
          "h-full mx-auto transition-all duration-300",
          getPreviewWidth()
        )}
      />
      <Toggle
        className="absolute top-0 left-0"
        onClick={() => setIsPointAndClick((prev) => !prev)}
      >
        Point & Click
      </Toggle>
      <AnimatePresence mode="wait">
        {comment && (
          <motion.div
            key={comment.id}
            className="absolute w-64"
            style={{ left: comment.point.x! - 256 / 2, top: comment.point.y }}
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            transition={{ duration: 0.1, ease: "easeOut" }}
          >
            <InlineEditCommand
              onSubmit={(text) => {
                if (!comment) return;
                sendMessage(
                  !!comment.screenshot
                    ? [
                        { type: "text", text },
                        { type: "image", image: comment.screenshot },
                      ]
                    : [{ type: "text", text }]
                );
                setComment(null);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
