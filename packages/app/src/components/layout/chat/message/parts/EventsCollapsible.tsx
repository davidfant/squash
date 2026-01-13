import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { usePrevious } from "@/hooks/use-previous";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { type ComponentType, type ReactNode, useEffect, useState } from "react";
import { type EventBlockItem } from "./groupMessageEvents";

export const Event = ({
  label,
  Icon,
  loading,
  shimmer,
  actions,
  onClick,
}: {
  label: ReactNode;
  Icon: ComponentType<{ className: string }> | null;
  loading: boolean;
  shimmer: boolean;
  actions?: ReactNode;
  onClick?: () => void;
}) => {
  const clickable = typeof onClick === "function";
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-muted-foreground text-sm min-h-7",
        clickable ? "cursor-pointer" : "cursor-default"
      )}
      onClick={onClick}
    >
      {loading ? (
        <Spinner className="size-3 shrink-0" />
      ) : (
        Icon && <Icon className="size-3 shrink-0" />
      )}
      <div
        className={cn(
          "flex-1 inline space-x-2 overflow-hidden *:max-w-full",
          shimmer && "shimmer"
        )}
      >
        {label}
      </div>
      {actions}
    </div>
  );
};

export function EventsCollapsible({
  events: _events,
  streaming,
}: {
  events: EventBlockItem[];
  streaming: boolean;
}) {
  const events = _events.map((e) => ({
    ...e,
    loading: e.loading && streaming,
  }));
  const [open, setOpen] = useState(streaming);
  const [dialogEvent, setDialogEvent] = useState<EventBlockItem | null>(null);
  const wasStreaming = usePrevious(streaming);
  useEffect(() => {
    if (wasStreaming && !streaming) {
      setOpen(false);
    }
  }, [streaming, wasStreaming]);

  const firstEvent = events[0]!;
  const handleEventSelection = (event: EventBlockItem | undefined) => {
    if (!event?.dialogContent) return;
    setDialogEvent(event);
  };

  const dialog = (
    <Dialog
      open={dialogEvent !== null}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setDialogEvent(null);
        }
      }}
    >
      {dialogEvent?.dialogContent && (
        <DialogContent>{dialogEvent.dialogContent}</DialogContent>
      )}
    </Dialog>
  );

  if (events.length === 1) {
    return (
      <>
        <Event
          label={firstEvent.label}
          Icon={firstEvent.icon}
          loading={firstEvent.loading}
          shimmer={firstEvent.loading}
          onClick={
            firstEvent.dialogContent
              ? () => handleEventSelection(firstEvent)
              : undefined
          }
        />
        {dialog}
      </>
    );
  }

  const otherCount = events.length - 1;
  const handleFirstEventClick = () => {
    if (!open) {
      setOpen(true);
      return;
    }

    if (firstEvent.dialogContent) {
      handleEventSelection(firstEvent);
      return;
    }

    setOpen(false);
  };

  return (
    <>
      <div className="@container">
        <Event
          label={
            open ? (
              firstEvent.label
            ) : (
              <>
                {firstEvent.label}
                <span>
                  {" "}
                  and {otherCount} more {otherCount === 1 ? "step" : "steps"}
                  ...
                </span>
              </>
            )
          }
          Icon={firstEvent.icon}
          loading={open ? firstEvent.loading : events.some((e) => e.loading)}
          shimmer={open ? firstEvent.loading : events.some((e) => e.loading)}
          actions={
            !streaming && (
              <Button
                size="sm"
                className="h-6 @max-[240px]:hidden"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen((prev) => !prev);
                }}
              >
                {open ? "Hide" : "See all"}
              </Button>
            )
          }
          onClick={handleFirstEventClick}
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
                <Event
                  key={idx}
                  label={event.label}
                  Icon={event.icon}
                  loading={event.loading}
                  shimmer={event.loading}
                  onClick={
                    event.dialogContent
                      ? () => handleEventSelection(event)
                      : undefined
                  }
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {dialog}
    </>
  );
}
