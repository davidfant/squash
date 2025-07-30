import { Alert, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import type { AssistantMessage as AssistantMessageType } from "@hypershape-ai/api/types";
import startCase from "lodash.startcase";
import { CircleCheck, Loader2 } from "lucide-react";
import { Markdown } from "../../Markdown";
import { useChat } from "../context";
import { MessageHeader } from "./MessageHeader";

export const AssistantMessage = ({
  message,
  header,
}: {
  message: AssistantMessageType;
  header: boolean;
}) => {
  const { toolResults } = useChat();
  const content = message.content
    .map((c, index) => {
      switch (c.type) {
        case "text":
          return <Markdown key={index}>{c.text}</Markdown>;
        case "tool-call":
          const result = toolResults[c.toolCallId];
          return (
            <Alert key={index}>
              {!result ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CircleCheck className="size-4" />
              )}
              <AlertTitle>{startCase(c.toolName)}</AlertTitle>
              {/* <AlertDescription>
              <pre>{JSON.stringify(c.args, null, 2)}</pre>
              {!!result && (
                <pre>{JSON.stringify(result.result, null, 2)}</pre>
              )}
            </AlertDescription> */}
            </Alert>
          );
      }
    })
    .filter((c) => !!c);
  return (
    <div>
      {header && <MessageHeader author="Splash" />}
      {!!content.length ? content : <Skeleton className="h-4 w-48 mb-4" />}
    </div>
  );
};
