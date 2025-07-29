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
import { z } from "zod";
import { createPage } from "../tools/page";
import { searchComponents } from "../tools/registry";

async function run<T extends ToolAction<any, any, any>>(data: {
  name: string;
  instructions: string;
  messages: Array<CoreUserMessage | CoreAssistantMessage | CoreToolMessage>;
  model: LanguageModelV1;
  tool: T;
}): Promise<{
  stream: AsyncIterable<TextStreamPart<any>, void, unknown>;
  response: Promise<{
    messages: Array<CoreAssistantMessage | CoreToolMessage>;
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
  });
  return {
    stream: result.fullStream,
    // response: Promise.all([result.response, result.toolResults])
    //   .then(([{ messages }, [res]]) => ({ messages, result: res!.result })),
    response: (async () => {
      console.log("woza...", await result.toolResults);
      return Promise.all([result.response, result.toolResults]).then(
        ([{ messages }, [res]]) => ({ messages, result: res!.result })
      );
    })(),
  };
}

// const generateRegistryComponentSearchQueries = createStep({
//   id: "generateRegistryComponentSearchQueries",
//   inputSchema: z.object({
//     messages: z
//       .object({
//         role: z.enum(["user", "assistant"]),
//         content: z.string(),
//       })
//       .array(),
//   }),
//   outputSchema: z.object({ summary: z.string() }),
//   execute: async ({ inputData }) => {
//     const res = await generateText({
//       model: google('gemini-2.5-flash'),
//       prompt: `
// We are building a website. You have been given a conversation with a user and your goal is to generate search queries for the component registry that are relevant to the page the user is trying to add.

// <conversation>
// ${inputData.messages.map((m) => `${m.role}: ${m.content}`).join("\n")}
// </conversation>
//       `.trim(),
//       tools: { searchComponents },
//       toolChoice: { type: 'tool', toolName: searchComponents.id },
//     });
//     return {
//       summary: res.text,
//       usage: { ...res.usage, modelId: res.response.modelId },
//     };
//   },
// });

const instructions = `
You are Splash, a website builder. You are given a conversation with a user and your goal is to add a page to a website.

The general process for adding a page is:
1. Search for components in the component registry that are relevant to the page being added
2. Create a new page with a list of sections. The sections can either be from the component registry or from existing sections used in the website.
3. For each section, fill in the content.
`.trim();

const agent = new Agent({
  name: "Add Page Agent",
  instructions,
  // model: anthropic("claude-sonnet-4-20250514"),
  model: google("gemini-2.5-flash"),
  tools: { searchComponents, createPage },
});

// export const addPage = createWorkflow({
//   id: "addPage",
//   inputSchema: summarizer.inputSchema,
//   outputSchema: z.object({ done: z.boolean() }),
// })
//   .then(summarizer)
//   .then(createStep({

//   }))
//   .then(agent)
//   .commit();

// export const createAddPageAgent = () => {
//   // anthropic("claude-sonnet-4-20250514").doStream

//   // 1. summarize conversation so far...

//   // const memory = new Memory({
//   //   storage: new PostgresStore({ connectionString: databaseUrl }),
//   //   vector: new PgVector({ connectionString: databaseUrl }),
//   //   options: { lastMessages: 10 },
//   // });

//   // return new Agent({
//   //   name: "Add Page Agent",
//   //   instructions,
//   //   // model: anthropic("claude-sonnet-4-20250514"),
//   //   model: google("gemini-2.5-flash"),
//   //   tools: { searchComponents, createPage },
//   //   // memory,
//   // });

// };

export async function* addPage(messages: AnyMessage[]) {
  const aiMessages: Array<
    CoreUserMessage | CoreAssistantMessage | CoreToolMessage
  > = [...messages];

  const componentsReq = await run({
    name: "Search Components",
    instructions: `We are building a website. You have been given a conversation with a user and your goal is to search in the component registry for components that are relevant to the page the user is trying to add. You should not ask the user any questions and should provide a best guess at what the user is trying to do.`,
    model: google("gemini-2.5-flash"),
    messages,
    tool: searchComponents,
  });
  for await (const p of componentsReq.stream) yield p;
  const components = await componentsReq.response;
  aiMessages.push(...components.messages);

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
    messages: aiMessages,
    tool: createPage,
  });
  for await (const p of pageReq.stream) yield p;
  const page = await pageReq.response;
  aiMessages.push(...page.messages);

  console.log("XXXXX", JSON.stringify(page.result, null, 2));
}
