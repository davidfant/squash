import type { AssistantMessage as AssistantMessageType } from "@hypershape-ai/api/types";
import { Markdown } from "../../Markdown";
import { MessageHeader } from "./MessageHeader";

export const AssistantMessage = ({
  message,
}: {
  message: AssistantMessageType;
}) => (
  <div>
    <MessageHeader author="LP" />
    {message.content.map((c, index) => {
      if (c.type === "text") {
        return <Markdown key={index}>{c.text}</Markdown>;
      }
    })}
  </div>
);
