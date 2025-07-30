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
import { searchComponents } from "../tools/registry";
import {
  createPage,
  updateMetadata,
  type RepoRuntimeContext,
} from "../tools/repo";

type ResponseMessage = (CoreAssistantMessage | CoreToolMessage) & {
  id: string;
};

function defer<T>() {
  let resolve!: (v: T | PromiseLike<T>) => void;
  let reject!: (e?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function runAgent<T extends ToolAction<any, any, any>>(data: {
  name: string;
  instructions: string;
  messages: Array<CoreUserMessage | CoreAssistantMessage | CoreToolMessage>;
  model: LanguageModelV1;
  tool: T;
  runtimeContext: RepoRuntimeContext;
  // }): Promise<{
  //   stream: AsyncIterable<TextStreamPart<any>, void, unknown>;
  //   response: Promise<{
  //     messages: ResponseMessage[];
  //     result: z.infer<T["outputSchema"]>;
  //   }>;
  // }> {
}): Promise<
  AsyncIterableWithResponse<
    TextStreamPart<any>,
    { messages: ResponseMessage[]; result: z.infer<T["outputSchema"]> }
  >
> {
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
    runtimeContext: data.runtimeContext,
    experimental_generateMessageId: () => randomUUID(),
  });

  return Object.assign(result.fullStream, {
    response: Promise.all([result.response, result.toolResults]).then(
      ([{ messages }, [res]]) => ({ messages, result: res!.result })
    ),
  });
}

function runTool<T extends ToolAction<any, any, any>>(
  tool: T,
  args: z.infer<T["inputSchema"]>,
  ctx: RepoRuntimeContext
): AsyncIterableWithResponse<
  TextStreamPart<any>,
  { messages: ResponseMessage[]; result: z.infer<T["outputSchema"]> }
> {
  const messageId = randomUUID();
  const toolCallId = randomUUID();

  const deferred = defer<{
    messages: ResponseMessage[];
    result: z.infer<T["outputSchema"]>;
  }>();
  const iterable = (async function* (): AsyncIterable<TextStreamPart<any>> {
    yield {
      type: "step-start",
      messageId,
      request: {},
      warnings: [],
    };

    yield { type: "tool-call", toolCallId, toolName: tool.id, args };

    const result = await tool.execute!({ runtimeContext: ctx, context: args });

    yield {
      type: "tool-result",
      toolCallId,
      toolName: tool.id,
      args: args,
      result,
    };
    yield {
      type: "step-finish",
      messageId,
      request: {},
      warnings: undefined,
      response: { id: messageId, timestamp: new Date(), modelId: "" },
      usage: { totalTokens: 0, promptTokens: 0, completionTokens: 0 },
      finishReason: "stop",
      providerMetadata: undefined,
      isContinued: false,
    };

    deferred.resolve({
      result,
      messages: [
        {
          id: messageId,
          role: "assistant",
          content: [{ type: "tool-call", args, toolCallId, toolName: tool.id }],
        },
        {
          id: toolCallId,
          role: "tool",
          content: [
            { type: "tool-result", toolCallId, toolName: tool.id, result },
          ],
        },
      ],
    });
  })();

  return Object.assign(iterable, { response: deferred.promise });
}

export function addPage(
  messages: AnyMessage[],
  ctx: RepoRuntimeContext
): AsyncIterableWithResponse<
  TextStreamPart<any>,
  { messages: ResponseMessage[] }
> {
  const newMessages: ResponseMessage[] = [];
  const deferred = defer<{ messages: ResponseMessage[] }>();

  const iterable = (async function* () {
    const componentsStream = await runAgent({
      name: "Search Components",
      instructions: `We are building a website. You have been given a conversation with a user and your goal is to search in the component registry for components that are relevant to the page the user is trying to add. You should not ask the user any questions and should provide a best guess at what the user is trying to do.`,
      model: google("gemini-2.5-flash"),
      messages: [...messages, ...newMessages],
      tool: searchComponents,
      runtimeContext: ctx,
    });
    for await (const p of componentsStream) yield p;
    const components = await componentsStream.response;
    newMessages.push(...components.messages.map((m) => ({ ...m, id: m.id })));

    const pageStream = await runAgent({
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
      runtimeContext: ctx,
    });
    for await (const p of pageStream) yield p;
    const page = await pageStream.response;
    newMessages.push(...page.messages);

    const metadataStream = await runTool(updateMetadata, undefined, ctx);
    for await (const p of metadataStream) yield p;
    const metadata = await metadataStream.response;
    newMessages.push(...metadata.messages);

    deferred.resolve({ messages: newMessages });
  })();

  return Object.assign(iterable, { response: deferred.promise });
}
