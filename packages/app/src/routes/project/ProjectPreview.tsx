import { useChat } from "@/components/layout/chat/context";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import {
  addEventListener,
  postMessage,
  type InlineCommentMessage,
} from "@hypershape-ai/utils/messaging";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useProjectContext, useSelectedPage } from "./context";
import { InlineEditCommand } from "./InlineEditCommand";

export function ProjectPreview() {
  const { screenSize, project, selectPage } = useProjectContext();
  const selectedPage = useSelectedPage();
  const { sendMessage } = useChat();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isPointAndClick, setIsPointAndClick] = useState(false);
  const [comment, setComment] = useState<
    (InlineCommentMessage & { screenshot?: string }) | null
  >(null);

  useEffect(
    () =>
      addEventListener("Navigate", (m) => {
        const page = project.metadata.pages.find((p) => p.path === m.path);
        if (page) selectPage(page.id);
      }),
    []
  );

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

  const getPreviewWidth = () => {
    if (screenSize === "desktop") return "w-full";
    if (screenSize === "tablet") return "w-[768px]";
    if (screenSize === "mobile") return "w-[375px]";
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
              onCancel={() => setComment(null)}
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
