import type { Metadata } from "@/types";
import { google } from "@ai-sdk/google";
import { stepCountIs, tool, wrapLanguageModel } from "ai";
import { traceable } from "langsmith/traceable";
import { z } from "zod";
import { generateText } from "../ai";
import { filesystemCacheMiddleware } from "../filesystemCacheMiddleware";
import { withCacheBreakpoints } from "../rewriteComponent/llm/withCacheBreakpoint";
import * as Prompts from "./prompts";

export interface ComponentToAnalyze {
  id: Metadata.ReactFiber.ComponentId;
  code: string;
  name: string | undefined;
}

export const analyzeComponent = (component: ComponentToAnalyze) =>
  traceable(
    async (
      comp: ComponentToAnalyze
    ): Promise<{
      id: Metadata.ReactFiber.ComponentId;
      reasoning: string | undefined;
      name: string;
      description: string;
      headOnly: boolean;
      functions: Array<{
        jsonPath: string;
        mayBeFunction: boolean;
        usedInRender: boolean;
        requiredForRender: boolean;
      }>;
    }> => {
      const { reasoningText, toolResults } = await generateText({
        model: wrapLanguageModel({
          model: google("gemini-2.5-flash"),
          middleware: filesystemCacheMiddleware(),
        }),
        messages: withCacheBreakpoints([
          { role: "system", content: Prompts.instructions },
          { role: "user", content: Prompts.userMessage(comp.code, comp.name) },
        ]),
        tools: {
          analyzeComponent: tool({
            description:
              "Analyze a minified React component and return metadata about the component.",
            inputSchema: z.object({
              name: z.string(),
              description: z.string(),
              headOnly: z.boolean(),
              functions: z
                .object({
                  jsonPath: z.string(),
                  mayBeFunction: z.boolean(),
                  usedInRender: z.boolean(),
                  requiredForRender: z.boolean(),
                })
                .array(),
            }),
            execute: () => ({ ok: true }),
          }),
        },
        toolChoice: { type: "tool", toolName: "analyzeComponent" },
        stopWhen: [
          ({ steps }) =>
            steps
              .flatMap((s) => s.toolResults)
              .some(
                (s) =>
                  !s.dynamic && s.toolName === "analyzeComponent" && s.output.ok
              ),
          stepCountIs(3),
        ],
      });

      const tr = toolResults[toolResults.length - 1];
      if (tr && !tr.dynamic && tr.toolName === "analyzeComponent") {
        return { ...tr.input, id: comp.id, reasoning: reasoningText };
      }

      throw new Error("Failed to analyze component");
    },
    { name: `Analyze Component ${component.id}` }
  )(component);
