import type { CoreAssistantMessage } from "ai";
import { Markdown } from "../../Markdown";
import { MessageHeader } from "./MessageHeader";

export const AssistantMessage = ({
  message,
}: {
  message: CoreAssistantMessage;
}) => (
  <div>
    <MessageHeader author="LP" />
    {typeof message.content === "string" ? (
      <Markdown>{message.content}</Markdown>
    ) : (
      message.content.map((c, index) => {
        if (c.type === "text") {
          return <Markdown key={index}>{c.text}</Markdown>;
        }
      })
    )}
  </div>
);
