import { WebPreview } from "@/components/ai-elements/web-preview";
import { SandboxTaskStream } from "@/components/blocks/SandboxTaskStream";
import { useMounted } from "@/hooks/useMounted";
import { cn } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import type { SandboxTaskMessage } from "@squashai/api/agent/types";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef } from "react";
import { useBranchContext } from "./context";
import { BranchPreviewLogs } from "./preview-logs";

export function BranchPreview({ className }: { className?: string }) {
  const { screenSize, previewPath, previewUrl, branch } = useBranchContext();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const stream = useChat<SandboxTaskMessage>({
    messages: [],
    transport: new DefaultChatTransport({
      api: `${import.meta.env.VITE_API_URL}/branches/${
        branch.id
      }/preview/stream`,
      credentials: "include",
    }),
  });

  const mounted = useMounted();
  useEffect(() => {
    if (mounted) {
      stream.sendMessage();
    }
  }, [mounted]);

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

  // if (Math.random()) {
  //   return (
  //     <Card className="p-0">
  //       <WebPreviewNavigation>
  //         {/* <Action tooltip="Go back">
  //           <ArrowLeft />
  //         </Action>
  //         <Action tooltip="Go forward">
  //           <ArrowRight />
  //         </Action> */}
  //         <Action tooltip="Refresh">
  //           <RefreshCw />
  //         </Action>
  //         <WebPreviewUrl className="mx-1" value={previewPath} />
  //         <Action tooltip="Select element">
  //           <MousePointerClick />
  //         </Action>
  //         <a href={`${preview?.url}${previewPath}`} target="_blank">
  //           <Action tooltip="Open in new tab">
  //             <ExternalLink />
  //           </Action>
  //         </a>
  //       </WebPreviewNavigation>
  //       <WebPreviewBody src={preview?.url} />
  //     </Card>
  //   );
  // }

  const placeholder = (
    <div className="flex flex-col gap-2 h-full items-center pt-[30%] p-8 overflow-y-auto">
      <SandboxTaskStream stream={stream} label="Your preview is loading..." />
    </div>
  );

  return (
    <div className={cn("relative h-full", className)}>
      <WebPreview>
        {/* <Card className="p-0 h-full overflow-hidden shadow-none bg-muted"> */}
        {!!previewUrl && (
          <div className="flex-1 flex flex-col z-2">
            <iframe
              ref={iframeRef}
              src={`${previewUrl}${previewPath}`}
              className={cn(
                "flex-1 mx-auto transition-all duration-300 z-2",
                getPreviewWidth()
              )}
            />
            <BranchPreviewLogs />
          </div>
        )}
        <div className="absolute inset-0 z-1 overflow-y-auto">
          {placeholder}
        </div>
        {/* </Card> */}
      </WebPreview>
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
