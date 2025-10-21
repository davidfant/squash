import {
  WebPreviewConsole,
  type WebPreviewConsoleLogEntry,
} from "@/components/ai-elements/web-preview";
import { useEffect, useMemo, useRef, useState } from "react";
import { useBranchContext } from "../context";

const MAX_LOG_LINES = 200;

export function BranchPreviewConsole() {
  const { branch } = useBranchContext();
  const [entries, setEntries] = useState<WebPreviewConsoleLogEntry[]>([]);
  const [status, setStatus] = useState<
    "connecting" | "open" | "closed" | "error"
  >("connecting");
  const containerRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef("");

  useEffect(() => {
    setEntries([]);
    setStatus("connecting");
    pendingRef.current = "";

    const appendLines = (lines: string[]) => {
      if (!lines.length) return;
      setEntries((prev) => {
        const next = [
          ...prev,
          ...lines.map((line) => ({
            message: line.length === 0 ? " " : line,
            level: "log" as const,
            timestamp: new Date(),
          })),
        ];
        return next.slice(-MAX_LOG_LINES);
      });
    };

    const flushPending = () => {
      const pending = pendingRef.current;
      pendingRef.current = "";
      if (pending) appendLines([pending]);
    };

    const url = `${import.meta.env.VITE_API_URL}/branches/${
      branch.id
    }/preview/logs`;
    const source = new EventSource(url, { withCredentials: true });

    source.onopen = () => setStatus("open");
    source.onerror = () => {
      if (source.readyState === EventSource.CLOSED) {
        flushPending();
        setStatus("closed");
      } else {
        setStatus("error");
      }
    };
    source.onmessage = (event) => {
      setStatus("open");
      const incoming = (event.data ?? "").replace(/\r/g, "");
      if (!incoming) return;

      const combined = pendingRef.current + incoming;
      const lines = combined.split("\n");
      pendingRef.current = lines.pop() ?? "";

      appendLines(lines);
    };

    return () => {
      flushPending();
      setStatus("closed");
      source.close();
    };
  }, [branch.id]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [entries]);

  const statusLabel = useMemo(() => {
    switch (status) {
      case "open":
        return "Live";
      case "error":
        return "Connection lost";
      case "closed":
        return "Ended";
      default:
        return "Connecting";
    }
  }, [status]);

  return <WebPreviewConsole logs={entries} />;
}
