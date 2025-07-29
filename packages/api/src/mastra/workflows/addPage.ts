import type { AsyncIterableWithResponse } from "@/lib/streaming";
import type { AnyMessage } from "@/types";
import { google } from "@ai-sdk/google";
import { Agent } from "@mastra/core/agent";
import type { ToolAction } from "@mastra/core/tools";
import type {
  CoreAssistantMessage,
  CoreToolMessage,
  CoreUserMessage,
  LanguageModelV1,
  TextStreamPart,
} from "ai";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createPage } from "../tools/page";
import { searchComponents } from "../tools/registry";

type ResponseMessage = (CoreAssistantMessage | CoreToolMessage) & {
  id: string;
};

async function run<T extends ToolAction<any, any, any>>(data: {
  name: string;
  instructions: string;
  messages: Array<CoreUserMessage | CoreAssistantMessage | CoreToolMessage>;
  model: LanguageModelV1;
  tool: T;
}): Promise<{
  stream: AsyncIterable<TextStreamPart<any>, void, unknown>;
  response: Promise<{
    messages: ResponseMessage[];
    result: z.infer<T["outputSchema"]>;
  }>;
}> {
  const agent = new Agent({
    name: data.name,
    instructions: data.instructions,
    model: data.model,
    tools: { [data.tool.id]: data.tool },
  });
  const result = await agent.stream(data.messages, {
    providerOptions: { google: { thinkingConfig: { includeThoughts: true } } },
    toolChoice: { type: "tool", toolName: data.tool.id },
    maxSteps: 1,
    experimental_generateMessageId: () => randomUUID(),
  });
  return {
    stream: result.fullStream,
    response: Promise.all([result.response, result.toolResults]).then(
      ([{ messages }, [res]]) => ({ messages, result: res!.result })
    ),
  };
}

function defer<T>() {
  let resolve!: (v: T | PromiseLike<T>) => void;
  let reject!: (e?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export function addPage(
  messages: AnyMessage[]
): AsyncIterableWithResponse<
  TextStreamPart<any>,
  { messages: ResponseMessage[] }
> {
  const newMessages: ResponseMessage[] = [];
  const deferred = defer<{ messages: ResponseMessage[] }>();

  const iterable = (async function* () {
    const componentsReq = await run({
      name: "Search Components",
      instructions: `We are building a website. You have been given a conversation with a user and your goal is to search in the component registry for components that are relevant to the page the user is trying to add. You should not ask the user any questions and should provide a best guess at what the user is trying to do.`,
      model: google("gemini-2.5-flash"),
      messages: [...messages, ...newMessages],
      tool: searchComponents,
    });
    for await (const p of componentsReq.stream) yield p;
    const components = await componentsReq.response;
    newMessages.push(...components.messages.map((m) => ({ ...m, id: m.id })));

    const pageReq = await run({
      name: "Create Page",
      instructions: `
  We are building a website. You have searched for section components in a registry and below have a list of the existing sections in the website. Next your goal is to create an outline for the page. You can either choose to reuse existing sections of the website or create new ones from the registry. You should not ask the user any questions and should provide a best guess at what the user is trying to do.
  
  <existing-sections>
  You can only reuse the below sections that are already in the website:
  N/A
  </existing-sections>
  `.trim(),
      model: google("gemini-2.5-flash"),
      messages: [...messages, ...newMessages],
      tool: createPage,
    });
    for await (const p of pageReq.stream) yield p;
    const page = await pageReq.response;
    newMessages.push(...page.messages);

    deferred.resolve({ messages: newMessages });
  })();

  return Object.assign(iterable, { response: deferred.promise });
}
