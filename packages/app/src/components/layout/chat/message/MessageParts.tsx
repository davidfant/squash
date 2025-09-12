import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePrevious } from "@/hooks/usePrevious";
import type { ChatMessage } from "@squash/api/agent/types";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Markdown } from "../../Markdown";
import { useChatContext } from "../context";
import {
  messagePartsToEvents,
  type EventBlockItem,
} from "./messagePartsToEvents";

const Event = ({
  event,
  actions,
}: {
  event: EventBlockItem;
  actions?: React.ReactNode;
}) => (
  <div className="flex items-center gap-2 text-muted-foreground text-sm min-h-7">
    <event.icon className="size-3 flex-shrink-0" />
    <div className="flex-1 inline space-x-2">{event.label}</div>
    {actions}
  </div>
);

function EventsCollapsible({
  events,
  streaming,
}: {
  events: EventBlockItem[];
  streaming: boolean;
}) {
  const [open, setOpen] = useState(streaming);
  const wasStreaming = usePrevious(streaming);
  useEffect(() => {
    if (wasStreaming && !streaming) {
      setOpen(false);
    }
  }, [streaming, wasStreaming]);

  const firstEvent = events[0]!;
  if (events.length === 1) {
    return <Event event={firstEvent} />;
  }

  const otherCount = events.length - 1;
  return (
    <div>
      <Event
        event={
          open
            ? firstEvent
            : {
                label: (
                  <>
                    {firstEvent.label}
                    <span>
                      and {otherCount} more{" "}
                      {otherCount === 1 ? "step" : "steps"}
                      ...
                    </span>
                  </>
                ),
                icon: firstEvent.icon,
              }
        }
        actions={
          !streaming && (
            <Button
              size="sm"
              className="h-6"
              variant="secondary"
              onClick={() => setOpen(!open)}
            >
              {open ? "Hide" : "See all"}
            </Button>
          )
        }
      />
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            {events.slice(1).map((event, idx) => (
              <Event key={idx} event={event} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MessageParts({ parts }: { parts: ChatMessage["parts"] }) {
  const { status } = useChatContext();
  const blocks = useMemo(
    () => messagePartsToEvents(parts, status),
    [parts, status]
  );

  if (!blocks.length) {
    return <Skeleton className="h-4 w-48" />;
  }

  return (
    <div className="space-y-5">
      {blocks.map((block, idx) => {
        if (block.type === "text") {
          return <Markdown key={idx}>{block.content}</Markdown>;
        }

        return (
          <EventsCollapsible
            key={idx}
            events={block.events}
            streaming={block.streaming}
          />
        );
      })}
    </div>
  );
}
