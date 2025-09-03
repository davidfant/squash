import type { Metadata } from "@/types";
import { anthropic, type AnthropicProviderOptions } from "@ai-sdk/anthropic";
import {
  InvalidToolInputError,
  tool,
  wrapLanguageModel,
  type ModelMessage,
} from "ai";
import { traceable } from "langsmith/traceable";
import { z } from "zod";
import { generateText } from "../ai";
import { filesystemCacheMiddleware } from "../filesystemCacheMiddleware";
import { withCacheBreakpoints } from "../rewriteComponent.old/llm/withCacheBreakpoint";
import * as Prompts from "./prompts";

interface ComponentToRewrite {
  id: Metadata.ReactFiber.ComponentId;
  code: string;
  name: string | undefined;
}

export const rewriteComponentWithLLM = (component: ComponentToRewrite) =>
  traceable(
    async (
      comp: ComponentToRewrite
    ): Promise<{
      id: Metadata.ReactFiber.ComponentId;
      reasoning: string | undefined;
      name: string;
      description: string;
      typescript: string;
      dependencies: Array<{ name: string; description: string }>;
    }> => {
      const messages: ModelMessage[] = [
        { role: "system", content: Prompts.instructions },
        { role: "user", content: Prompts.userMessage(comp.code, comp.name) },
      ];

      for (let attempt = 0; attempt < 2; attempt++) {
        const { reasoningText, toolCalls, response } = await generateText({
          model: wrapLanguageModel({
            model: anthropic("claude-sonnet-4-20250514"),
            middleware: filesystemCacheMiddleware(),
          }),
          messages: withCacheBreakpoints(messages),
          tools: {
            rewriteComponent: tool({
              description:
                "Rewrite a minified React component into idiomatic TypeScript and return metadata about the rewrite.",
              inputSchema: z.object({
                name: z.string(),
                typescript: z.string(),
                description: z.string(),
                dependencies: z
                  .object({ name: z.string(), description: z.string() })
                  .array(),
              }),
            }),
          },
          providerOptions:
            attempt === 0
              ? {
                  anthropic: {
                    thinking: { type: "enabled", budgetTokens: 1024 },
                  } satisfies AnthropicProviderOptions,
                }
              : undefined,
          // stopWhen: [stepCountIs(1)],
        });
        messages.push(...response.messages);

        const tc = toolCalls[toolCalls.length - 1];
        if (
          tc &&
          tc.toolName === "rewriteComponent" &&
          tc.invalid &&
          tc.error instanceof InvalidToolInputError
        ) {
          messages.push({ role: "user", content: tc.error.message });
          continue;
        }

        if (tc && !tc.dynamic && tc.toolName === "rewriteComponent") {
          return { ...tc.input, id: comp.id, reasoning: reasoningText };
        }

        break;
      }
      throw new Error("Failed to rewrite component");
    },
    { name: `Rewrite Component ${component.id}` }
  )(component);
