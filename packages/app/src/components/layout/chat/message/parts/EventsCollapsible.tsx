import { Button } from "@/components/ui/button";
import { usePrevious } from "@/hooks/usePrevious";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { type EventBlockItem } from "./groupMessageEvents";

const Event = ({
  event,
  actions,
  onClick,
}: {
  event: EventBlockItem;
  actions?: React.ReactNode;
  onClick?: () => void;
}) => (
  <div
    className="flex items-center gap-2 text-muted-foreground text-sm min-h-7 cursor-pointer"
    onClick={onClick}
  >
    {event.loading ? (
      <Loader2 className="size-3 flex-shrink-0 animate-spin" />
    ) : (
      <event.icon className="size-3 flex-shrink-0" />
    )}
    <div className="flex-1 inline space-x-2 overflow-hidden [&>*]:max-w-full">
      {event.label}
    </div>
    {actions}
  </div>
);

export function EventsCollapsible({
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
    <div className="@container">
      <Event
        onClick={() => setOpen(!open)}
        event={
          open
            ? firstEvent
            : {
                label: (
                  <>
                    {firstEvent.label}
                    <span>
                      {" "}
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
              className="h-6 @max-[240px]:hidden"
              variant="outline"
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
