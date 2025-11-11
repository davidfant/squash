import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@clerk/clerk-react";
import { SquashIframeBridge } from "@squashai/iframe-bridge";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Skeleton } from "../ui/skeleton";

export function Iframe({
  url,
  className,
  onNavigate,
}: {
  url: string;
  className?: string;
  onNavigate?: (path: string) => void;
}) {
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
    bridge?.on("navigate", (p) => onNavigate?.(p.path));
  }, [bridge]);

  const { getToken, sessionId } = useAuth();
  useEffect(() => {
    if (!bridge) return;

    const pushToken = async () => {
      try {
        const token = await getToken({ skipCache: true });
        if (!token) return;
        bridge.post({
          source: "@squashai/iframe-bridge",
          id: crypto.randomUUID(),
          command: "jwt-token",
          token,
        });
      } catch (error) {
        console.error("Failed to fetch Clerk token", error);
      }
    };

    const unsubscribe = bridge.on("connected", pushToken);
    void pushToken();

    const interval = window.setInterval(pushToken, 50_000);
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [bridge, getToken, sessionId]);

  return (
    <iframe
      ref={iframeRef}
      src={url}
      className={cn("w-full h-full", className)}
      allow="microphone; speech-recognition; on-device-speech-recognition"
    />
  );
}

export function IframeCard({
  url,
  imageUrl,
  loading,
  className,
  fallback = "No preview available",
}: {
  url: string | null;
  imageUrl?: string | null;
  loading?: boolean;
  className?: string;
  fallback?: ReactNode;
  onNavigate?: (path: string) => void;
}) {
  return (
    <Card className={cn("p-0 overflow-hidden shadow-none bg-muted", className)}>
      {url ? (
        <Iframe url={url} className="w-full h-full" />
      ) : imageUrl ? (
        <img
          src={imageUrl}
          alt="Preview"
          className="w-full h-full object-cover"
        />
      ) : loading ? (
        <Skeleton className="w-full h-full" />
      ) : (
        <div className="h-full grid place-items-center text-muted-foreground text-sm">
          {fallback}
        </div>
      )}
    </Card>
  );
}
