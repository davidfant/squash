import type { SourceUIPart, TextUIPart } from "@ai-sdk/ui-utils";
import type { TextStreamPart } from "ai";
import { createParser } from "eventsource-parser";

export async function sseStream(opts: {
  endpoint: string;
  message?: {
    id: string;
    role: "user";
    content: string;
    parts: Array<TextUIPart | SourceUIPart>;
  };
  onEvent: (chunk: TextStreamPart<any>) => void;
}) {
  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/${opts.endpoint}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(opts.message),
    }
  );

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }
  if (!response.body) {
    throw new Error("No response body");
  }

  let rejected = false;
  return new Promise<void>(async (resolve, reject) => {
    const parser = createParser({
      onEvent: (event) => {
        if (event.event === "error") {
          rejected = true;
          const { message } = JSON.parse(event.data);
          reject(new Error(message));
        } else {
          opts.onEvent(JSON.parse(event.data));
        }
      },
    });

    const decoder = new TextDecoder();
    const reader = response.body!.getReader();
    while (!rejected) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value);
      parser.feed(text);
    }

    if (!rejected) resolve();
  });
}
