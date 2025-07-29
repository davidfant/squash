import type { AnyMessage } from "@/types";
import { google } from "@ai-sdk/google";
import { Agent } from "@mastra/core/agent";
import { createPage } from "../tools/page";
import { searchComponents } from "../tools/registry";

const searchComponentsAgent = new Agent({
  name: "Generate Registry Component Search Queries",
  instructions: `We are building a website. You have been given a conversation with a user and your goal is to search in the component registry for components that are relevant to the page the user is trying to add. Before calling the tool to search for components you MUST respond with a short message to the user explaining what you will search for. You should not ask the user any questions and should immediately search for components.`,
  model: google("gemini-2.5-flash"),
  tools: { searchComponents },
});

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
1. Search for components in the component registry that are relevant to the page
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
  const queries = await searchComponentsAgent.stream(messages, {
    providerOptions: { google: { thinkingConfig: { includeThoughts: true } } },
    // toolChoice: { type: "tool", toolName: searchComponents.id },
    maxSteps: 1,
  });
  for await (const p of queries.fullStream) yield p;

  console.log("XXXXX", JSON.stringify(await queries.response, null, 2));

  queries.toolCalls;
}
