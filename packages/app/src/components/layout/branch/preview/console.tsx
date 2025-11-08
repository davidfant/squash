import { FadingScrollView } from "@/components/blocks/fading-scroll-view";
import { Fragment, useEffect, useRef, useState } from "react";
import { useStickToBottom } from "use-stick-to-bottom";
import { useBranchContext } from "../context";
import { ToolCallItem, type ToolCall } from "./console-tool-call";
import { zConsoleLogEntrySchema, type ConsoleLogEntry } from "./schemas";

function parseConsoleLogEntry(line: string): ConsoleLogEntry | undefined {
  try {
    return zConsoleLogEntrySchema.parse(JSON.parse(line));
  } catch (error) {
    return undefined;
  }
}

export function BranchPreviewConsole() {
  const { branch } = useBranchContext();
  const { scrollRef, contentRef } = useStickToBottom({ initial: "instant" });
  const [toolCallIds, setToolCallIds] = useState<string[]>([]);
  const [toolCalls, setToolCalls] = useState<Record<string, ToolCall>>({});
  const [status, setStatus] = useState<
    "connecting" | "open" | "closed" | "error"
  >("connecting");
  const pendingRef = useRef("");

  useEffect(() => {
    setToolCallIds([]);
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
            d.type === "composio-tool-call" ||
            d.type === "composio-tool-result" ||
            d.type === "composio-tool-error"
        );

      setToolCallIds((prev) => [
        ...prev,
        ...parsed
          .map((d) => d.id)
          .filter((id, idx, all) => all.indexOf(id) === idx)
          .filter((id) => !prev.includes(id)),
      ]);
      setToolCalls((prev) =>
        parsed.reduce((acc, d) => {
          if (d.type === "composio-tool-call") {
            acc[d.id] = {
              id: d.id,
              tool: d.tool,
              input: d.input,
              output: undefined,
              error: undefined,
              state: "input",
            };
          } else if (d.type === "composio-tool-result" && acc[d.id]) {
            acc[d.id]!.output = d.data;
            acc[d.id]!.state = "output";
          } else if (d.type === "composio-tool-error" && acc[d.id]) {
            acc[d.id]!.error = d.error;
            acc[d.id]!.state = "error";
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

  return (
    <FadingScrollView
      ref={scrollRef}
      className="h-full w-96 flex flex-col"
      height={64}
    >
      <div ref={contentRef} className="space-y-2">
        {toolCallIds.length === 0 ? (
          <p className="text-muted-foreground">No console output</p>
        ) : (
          toolCallIds
            .map((id) => toolCalls[id])
            .filter((t) => !!t)
            .map((tc, index) => (
              <Fragment key={index}>
                {index !== 0 && (
                  <div className="flex justify-center">
                    <div className="h-8 border-l border-dashed" />
                  </div>
                )}
                <ToolCallItem toolCall={tc} />
              </Fragment>
            ))
        )}
      </div>
    </FadingScrollView>
  );
}
