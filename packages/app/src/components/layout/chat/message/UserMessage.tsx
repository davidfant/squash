import type { ChatMessage } from "@squash/api/agent/types";
import { FilePreview } from "../../file/FilePreview";
import type { VariantOptions } from "../messageLineage";
import { MessageParts } from "./MessageParts";
import { UserMessageActions } from "./UserMessageActions";

interface UserMessageProps {
  message: ChatMessage;
  variants: VariantOptions | undefined;
  onEdit(): void;
  onVariantChange(parentId: string, chosenChildId: string): void;
}

export function UserMessage({
  message,
  variants,
  onEdit,
  onVariantChange,
}: UserMessageProps) {
  const files = message.parts
    .filter((p) => p.type === "file")
    .map((p, i) => <FilePreview key={i} file={p} />);
  return (
    <div className="group flex flex-col items-end gap-1" key={message.id}>
      {!!files.length && (
        <div className="flex flex-wrap gap-2 justify-end mt-1">{files}</div>
      )}
      <div className="w-max max-w-[75%] rounded-xl px-4 py-3 bg-muted">
        <MessageParts parts={message.parts} />
      </div>

      <UserMessageActions
        className="opacity-0 group-hover:opacity-100 transition-opacity"
        variants={variants}
        onEdit={onEdit}
        onVariantChange={onVariantChange}
      />
    </div>
  );
}
