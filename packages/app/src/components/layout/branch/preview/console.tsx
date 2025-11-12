import { FadingScrollView } from "@/components/blocks/fading-scroll-view";
import { useAuthHeaders } from "@/hooks/api";
import { EventSourcePolyfill } from "event-source-polyfill";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { useStickToBottom } from "use-stick-to-bottom";
import { useBranchContext } from "../context";
import {
  AIGatewayLogItemHeader,
  ConsoleLogItem,
  ConsoleLogItemDetails,
  ToolCallLogItemHeader,
  type LogItemStatus,
} from "./console-log-item";
import { zConsoleLogEntrySchema, type ConsoleLogEntry } from "./schemas";

function parseConsoleLogEntry(line: string): ConsoleLogEntry | undefined {
  try {
    return zConsoleLogEntrySchema.parse(JSON.parse(line));
  } catch (error) {
    return undefined;
  }
}

interface LogItem {
  id: string;
  title: ReactNode;
  details: ReactNode;
  input: unknown;
  status: LogItemStatus;
}

export function BranchPreviewConsole() {
  const { branch } = useBranchContext();
  const { scrollRef, contentRef } = useStickToBottom({ initial: "instant" });
  const [logItemIds, setLogItemIds] = useState<string[]>([]);
  const [logItems, setLogItems] = useState<Record<string, LogItem>>({});
  const [status, setStatus] = useState<
    "connecting" | "open" | "closed" | "error"
  >("connecting");
  const pendingRef = useRef("");

  const getHeaders = useAuthHeaders();
  useEffect(() => {
    setLogItemIds([]);
    setStatus("connecting");
    pendingRef.current = "";

    const appendLines = (lines: string[]) => {
      if (!lines.length) return;
      const parsed = lines
        .map(parseConsoleLogEntry)
        .filter((e) => !!e)
        .map((d) => d.data)
        .filter(
          (d) =>
            d.event === "composio-tool-call" ||
            d.event === "composio-tool-result" ||
            d.event === "composio-tool-error" ||
            d.event === "ai-gateway-generate-input" ||
            d.event === "ai-gateway-generate-output" ||
            d.event === "ai-gateway-generate-error"
        );

      setLogItemIds((prev) => [
        ...prev,
        ...parsed
          .map((d) => d.id)
          .filter((id, idx, all) => all.indexOf(id) === idx)
          .filter((id) => !prev.includes(id)),
      ]);
      console.log("LAINs", lines);
      setLogItems((prev) =>
        parsed.reduce((acc, d) => {
          const t = acc[d.id];
          if (!t) {
            if (d.event === "composio-tool-call") {
              acc[d.id] = {
                id: d.id,
                title: <ToolCallLogItemHeader tool={d.tool} />,
                details: (
                  <ConsoleLogItemDetails input={d.input} status="input" />
                ),
                input: d.input,
                status: "input",
              };
            } else if (d.event === "ai-gateway-generate-input") {
              acc[d.id] = {
                id: d.id,
                title: (
                  <AIGatewayLogItemHeader model={d.model} label="Generate" />
                ),
                details: (
                  <ConsoleLogItemDetails input={d.prompt} status="input" />
                ),
                input: d.prompt,
                status: "input",
              };
            }
          } else {
            if (d.event === "composio-tool-result") {
              t.details = (
                <ConsoleLogItemDetails
                  input={t.input}
                  output={d.data}
                  status="output"
                />
              );
              t.status = "output";
            } else if (d.event === "composio-tool-error") {
              t.status = "error";
            } else if (d.event === "ai-gateway-generate-output" && t) {
              t.details = (
                <ConsoleLogItemDetails
                  input={t.input}
                  output={d.content}
                  status="output"
                />
              );
              t.status = "output";
            } else if (d.event === "ai-gateway-generate-error" && t) {
              t.details = (
                <ConsoleLogItemDetails
                  input={t.input}
                  error={d.error}
                  status="error"
                />
              );
              t.status = "error";
            }
          }

          return acc;
        }, prev)
      );
    };

    const flushPending = () => {
      const pending = pendingRef.current;
      pendingRef.current = "";
      if (pending) appendLines([pending]);
    };

    const abortController = new AbortController();

    const url = `${import.meta.env.VITE_API_URL}/branches/${
      branch.id
    }/preview/logs`;

    const open = async () => {
      const headers = await getHeaders();
      if (abortController.signal.aborted) return;
      const source = new EventSourcePolyfill(url, { headers });

      source.onopen = () => setStatus("open");
      source.onmessage = (event) => {
        setStatus("open");
        const incoming = (event.data ?? "").replace(/\r/g, "");
        if (!incoming) return;

        const combined = pendingRef.current + incoming;
        const lines = combined.split("\n");
        pendingRef.current = lines.pop() ?? "";

        appendLines(lines);
      };
      source.onerror = (e: any) => {
        if (e.status === 401) {
          source.close();
          open();
        }
      };
    };

    open();

    return () => {
      flushPending();
      setStatus("closed");
      abortController.abort();
    };
  }, [branch.id, getHeaders]);

  if (logItemIds.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-muted-foreground text-sm">
        Tool calls will appear here
      </div>
    );
  }
  return (
    <FadingScrollView
      ref={scrollRef}
      className="h-full w-1/4 flex flex-col pr-2"
      height={64}
    >
      <div ref={contentRef}>
        {logItemIds
          .map((id) => logItems[id])
          .filter((item) => !!item)
          .map((item, index) => (
            <Fragment key={index}>
              {index !== 0 && (
                <div className="flex justify-center">
                  <div className="h-8 border-l border-dashed" />
                </div>
              )}
              <ConsoleLogItem
                title={item.title}
                details={item.details}
                status={item.status}
              />
            </Fragment>
          ))}
      </div>
    </FadingScrollView>
  );
}
