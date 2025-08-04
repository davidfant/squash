import type { SandboxRuntimeContext } from "@/agent/types";
import { tool } from "ai";
import { z } from "zod";
import { zExplanation } from "./common";

export const webSearch = (ctx: SandboxRuntimeContext) =>
  tool({
    description: `
Search the web for real-time information about any topic. This tool will use a separate AI agent with web search capabilities to perform the search and return a text based response with citations.

Use this tool when you need up-to-date information that might not be available in your training data, or when you need to verify current facts. The search results will include relevant snippets and URLs from web pages. This is particularly useful for questions about documentation, specific technical information, a specific product/service/person/company, current events, technology updates, or any topic that requires recent information.
`.trim(),
    inputSchema: z.object({
      instruction: z
        .string()
        .describe(
          "Clear instructions for the web search agent to perform. This should be 1+ sentence instruction describing what you want to search for. This can be a question, a request for information, or a specific topic to research."
        ),
      explanation: zExplanation,
    }),
    outputSchema: z.object({
      result: z.string(),
      citations: z.array(z.string()),
    }),
    execute: async ({ instruction }) => {
      // TODO: call web search agent
      // return { result: "Web search completed: " + instruction, citations: [] };
      throw new Error("Not implemented");
    },
  });
