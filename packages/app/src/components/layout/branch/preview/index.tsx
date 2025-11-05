import { cn } from "@/lib/utils";
import { useAuth } from "@clerk/clerk-react";
import { SquashIframeBridge } from "@squashai/iframe-bridge";
import { useEffect, useRef, useState } from "react";
import { useBranchContext } from "../context";
import { BranchPreviewConsole } from "./console";

const Iframe = () => {
  const { screenSize, preview } = useBranchContext();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [bridge, setBridge] = useState<SquashIframeBridge | undefined>();
  useEffect(() => {
    const window = iframeRef.current?.contentWindow;
    if (!window) throw new Error("Iframe not found");
    setBridge(
      new SquashIframeBridge(window, {
        debug: import.meta.env.MODE === "development",
      })
    );
  }, []);

  useEffect(() => () => bridge?.dispose(), [bridge]);
  useEffect(() => {
    bridge?.on("navigate", (p) => preview.setCurrentPath(p.path));
  }, [bridge]);

  const { getToken } = useAuth();
  useEffect(() => {
    const pushToken = async () => {
      const token = await getToken();
      if (!token) return;
      bridge?.post({
        source: "@squashai/iframe-bridge",
        id: crypto.randomUUID(),
        command: "jwt-token",
        token,
      });
    };
    bridge?.on("connected", pushToken);

    const interval = setInterval(pushToken, 10_000);
    return () => clearInterval(interval);
  }, [bridge, getToken]);

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
