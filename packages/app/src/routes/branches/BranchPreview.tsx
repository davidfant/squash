import { SandboxTaskStream } from "@/components/blocks/SandboxTaskStream";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import type { StartSandboxMessage } from "@squashai/api/agent/types";
import { DefaultChatTransport } from "ai";
import { useRef } from "react";
import { useBranchContext } from "./context";

export function BranchPreview({ className }: { className?: string }) {
  const { screenSize, previewPath, preview, branch } = useBranchContext();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const stream = useChat<StartSandboxMessage>({
    messages: [],
    resume: true,
    transport: new DefaultChatTransport({
      credentials: "include",
      prepareReconnectToStreamRequest: () => ({
        api: `${import.meta.env.VITE_API_URL}/repos/branches/${
          branch.id
        }/preview/stream`,
      }),
    }),
  });
  const tasks = stream.messages
    .flatMap((m) => m.parts)
    .filter((p) => p.type === "tool-SandboxTask")
    .filter((t) => !!t.input?.title);

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
    <div className="flex flex-col gap-2 h-full items-center justify-center">
      <SandboxTaskStream stream={stream} label="Your preview is loading..." />
    </div>
  );

  return (
    <div className={cn("relative h-full", className)}>
      <Card className="p-0 h-full overflow-hidden shadow-none bg-muted">
        {!!preview && (
          <iframe
            ref={iframeRef}
            src={`${preview.url}${previewPath}`}
            className={cn(
              "h-full mx-auto transition-all duration-300 z-2",
              getPreviewWidth()
            )}
          />
        )}
        <div className="absolute inset-0 z-1">{placeholder}</div>
      </Card>
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
