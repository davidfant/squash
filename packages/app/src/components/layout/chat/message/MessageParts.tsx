import { Skeleton } from "@/components/ui/skeleton";
import type { ChatMessage } from "@hypershape-ai/api/agent/types";
import { Markdown } from "../../Markdown";

export function MessageParts({ parts }: { parts: ChatMessage["parts"] }) {
  const renderedParts = parts
    .map((c, index) => {
      switch (c.type) {
        case "text":
          return <Markdown key={index}>{c.text}</Markdown>;
        case "file":
        case "step-start":
          return null;
        default:
          return "TODO: render " + JSON.stringify(c);
      }
    })
    .filter((p) => !!p);

  return renderedParts.length ? (
    renderedParts
  ) : (
    <Skeleton className="h-4 w-48 mb-4" />
  );
}
