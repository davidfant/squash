import type { ChatMessage } from "@squashai/api/agent/types";
import { useMemo } from "react";
import { Markdown } from "../../../Markdown";
import { ConnectToToolkitAlert } from "./ConnectToToolkitAlert";
import { Event, EventsCollapsible } from "./EventsCollapsible";
import { GitCommitAlert } from "./GitCommitAlert";
import { groupMessageEvents } from "./groupMessageEvents";
import { ReasoningSummaries } from "./ReasoningSummaries";

export function MessageParts({
  id,
  parts,
  streaming = false,
}: {
  id: string;
  parts: ChatMessage["parts"];
  streaming?: boolean;
}) {
  const blocks = useMemo(
    () => groupMessageEvents(parts, streaming),
    [parts, streaming]
  );
  console.log("MessageParts", { id, streaming, blocks });
  if (!blocks.length) {
    return (
      <p className="text-muted-foreground italic text-sm">
        Failed to respond. Please try again.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "text":
            // return null;
            return <Markdown key={idx}>{block.content}</Markdown>;
          case "reasoning":
            return <ReasoningSummaries key={idx} block={block} />;
          // case "abort":
          //   return (
          //     <Alert className="text-muted-foreground">
          //       <CircleSlash />
          //       <AlertTitle>Cancelled</AlertTitle>
          //     </Alert>
          //   );
          case "commit":
            return (
              <GitCommitAlert
                key={idx}
                title={block.title}
                sha={block.sha}
                messageId={id}
              />
            );
          case "events":
            return (
              <EventsCollapsible
                key={idx}
                events={block.events}
                streaming={streaming}
              />
            );
          case "loading":
            // return <Skeleton key={idx} className="h-4 w-48" />;
            return (
              <Event
                key={idx}
                label="Thinking..."
                Icon={null}
                loading={false}
                shimmer={true}
              />
            );
          case "connect-to-toolkit":
            return <ConnectToToolkitAlert key={idx} block={block} />;
        }
      })}
    </div>
  );
}
