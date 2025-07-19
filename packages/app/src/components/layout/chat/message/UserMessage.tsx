import { Badge } from "@/components/ui/badge";
import type { CoreUserMessage } from "ai";
import { FilePreview } from "../../file/FilePreview";
import { Markdown } from "../../Markdown";

export function UserMessage({ message }: { message: CoreUserMessage }) {
  const files = (typeof message.content === "string" ? [] : message.content)
    .filter((p) => p.type === "file" || p.type === "image")
    // .map((p, i) => (
    //   <a
    //     key={i}
    //     href={p.data.type === "url" ? p.data.url : undefined}
    //     target="_blank"
    //   >
    //     <FilePreview file={p} />
    //   </a>
    // ));
    .map((p, i) => <FilePreview key={i} file={p} />);

  return (
    <div className="flex flex-col items-end">
      <div className="w-max max-w-[75%] rounded-xl px-3 py-2 bg-muted">
        <Badge variant="outline" className="rounded-sm px-1">
          File.tsx
        </Badge>
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
      {!!files.length && (
        <div className="flex flex-wrap gap-2 justify-end mt-1">{files}</div>
      )}
    </div>
  );
}
