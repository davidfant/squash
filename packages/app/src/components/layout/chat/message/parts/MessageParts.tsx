import { Alert, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChatMessage } from "@squashai/api/agent/types";
import { CircleSlash } from "lucide-react";
import { useMemo } from "react";
import { Markdown } from "../../../Markdown";
import { EventsCollapsible } from "./EventsCollapsible";
import { GitCommitAlert } from "./GitCommitAlert";
import { groupMessageEvents } from "./groupMessageEvents";

export function MessageParts({ parts }: { parts: ChatMessage["parts"] }) {
  const blocks = useMemo(() => groupMessageEvents(parts), [parts]);

  if (!blocks.length) {
    return <Skeleton className="h-4 w-48" />;
  }

  return (
    <div className="space-y-3">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "text":
            return <Markdown key={idx}>{block.content}</Markdown>;
          case "abort":
            return (
              <Alert className="text-muted-foreground">
                <CircleSlash />
                <AlertTitle>Cancelled</AlertTitle>
              </Alert>
            );
          case "commit":
            return (
              <GitCommitAlert key={idx} title={block.title} sha={block.sha} />
            );
          case "events":
            return (
              <EventsCollapsible
                key={idx}
                events={block.events}
                streaming={block.streaming}
              />
            );
        }
      })}
    </div>
  );
}
