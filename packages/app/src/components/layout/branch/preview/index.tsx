import { cn } from "@/lib/utils";
import { SquashIframeBridge } from "@squashai/iframe-bridge";
import { useEffect, useRef } from "react";
import { useBranchContext } from "../context";
import { BranchPreviewConsole } from "./console";

const Iframe = () => {
  const { screenSize, preview } = useBranchContext();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const window = iframeRef.current?.contentWindow;
    if (!window) return;
    const bridge = new SquashIframeBridge(window, {
      debug: import.meta.env.MODE === "development",
    });
    bridge.on("navigate", (p) => preview.setCurrentPath(p.path));
    return () => bridge.dispose();
  }, [iframeRef.current?.contentWindow]);

  const getPreviewWidth = () => {
    if (screenSize === "desktop") return "w-full";
    if (screenSize === "tablet") return "w-[768px]";
    if (screenSize === "mobile") return "w-[375px]";
  };

  return (
    <iframe
      ref={iframeRef}
      key={preview.refreshKey}
      src={`${preview.url}${preview.initialPath}`}
      className={cn(
        "flex-1 mx-auto transition-all duration-300 z-2",
        getPreviewWidth()
      )}
      allow="microphone; speech-recognition; on-device-speech-recognition; clipboard-read; clipboard-write;"
    />
  );
};

export function BranchPreview({ className }: { className?: string }) {
  const { preview } = useBranchContext();
  if (!preview.url) return null;
  return (
    <div className={cn("flex flex-col", className)}>
      <Iframe />
      <BranchPreviewConsole />
    </div>
  );
}
