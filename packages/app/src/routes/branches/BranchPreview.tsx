import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useRef } from "react";
import { useBranchContext } from "./context";

export function BranchPreview() {
  const { screenSize, branch, previewPath, previewUrl, setPreviewPath } =
    useBranchContext();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // useEffect(
  //   () =>
  //     addEventListener("Navigate", (m) => {
  //       setPreviewPath(m.path);
  //     }),
  //   []
  // );

  // useEffect(() => {
  //   postMessage(
  //     { type: "InlineCommentSettings", enabled: isPointAndClick },
  //     "*",
  //     iframeRef.current?.contentWindow ?? null
  //   );

  //   if (isPointAndClick) {
  //     const unsubInlineComment = addEventListener("InlineComment", setComment);
  //     const unsubInlineCommentScreenshot = addEventListener(
  //       "InlineCommentScreenshot",
  //       (c) =>
  //         setComment((p) =>
  //           p?.id === c.id ? { ...p, screenshot: c.screenshot } : p
  //         )
  //     );
  //     return () => {
  //       unsubInlineComment();
  //       unsubInlineCommentScreenshot();
  //     };
  //   } else {
  //     setComment(null);
  //   }
  // }, [isPointAndClick]);

  const getPreviewWidth = () => {
    if (screenSize === "desktop") return "w-full";
    if (screenSize === "tablet") return "w-[768px]";
    if (screenSize === "mobile") return "w-[375px]";
  };

  return (
    <div className="relative h-full">
      {previewUrl ? (
        <iframe
          ref={iframeRef}
          src={`${previewUrl}${previewPath}`}
          className={cn(
            "h-full mx-auto transition-all duration-300",
            getPreviewWidth()
          )}
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="size-8 animate-spin opacity-30" />
        </div>
      )}
      {/* <AnimatePresence mode="wait">
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
      </AnimatePresence> */}
    </div>
  );
}
