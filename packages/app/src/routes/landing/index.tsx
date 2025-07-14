import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { convertStreamPartsToMessages } from "@/lib/convertStreamPartsToMessages";
import { sseStream } from "@/lib/sseStream";
import type { TextStreamPart } from "ai";
import { useState } from "react";

export function LandingPage() {
  const [value, setValue] = useState("");
  const [parts, setParts] = useState<TextStreamPart<any>[]>([]);

  const messages = convertStreamPartsToMessages(parts);

  console.log("XXX", parts, messages);

  return (
    <>
      <Input value={value} onChange={(e) => setValue(e.target.value)} />
      <Button
        onClick={() =>
          sseStream({
            endpoint: "chat",
            message: {
              id: "1",
              role: "user",
              content: value,
              parts: [{ type: "text", text: value }],
            },
            onEvent: (chunk) => setParts((prev) => [...prev, chunk]),
          })
        }
      >
        Send
      </Button>
      <div>{parts.length}</div>
    </>
  );
}
