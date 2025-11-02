import { cn } from "@/lib/utils";
import { useRef } from "react";
import { useBranchContext } from "../context";
import { BranchPreviewConsole } from "./console";

export function BranchPreview({ className }: { className?: string }) {
  const { screenSize, previewPath, previewUrl } = useBranchContext();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const getPreviewWidth = () => {
    if (screenSize === "desktop") return "w-full";
    if (screenSize === "tablet") return "w-[768px]";
    if (screenSize === "mobile") return "w-[375px]";
  };

  if (!previewUrl) return null;
  return (
    <div className={cn("flex flex-col", className)}>
      <iframe
        ref={iframeRef}
        src={`${previewUrl}${previewPath}`}
        className={cn(
          "flex-1 mx-auto transition-all duration-300 z-2",
          getPreviewWidth()
        )}
        allow="microphone; speech-recognition; on-device-speech-recognition; clipboard-read; clipboard-write;"
      />
      <BranchPreviewConsole />
    </div>
  );
}
