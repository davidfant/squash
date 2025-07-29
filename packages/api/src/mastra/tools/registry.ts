import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const searchComponents = createTool({
  id: "searchComponents",
  description:
    "Search the component registry for component blocks and sections",
  inputSchema: z.object({
    queries: z.string().array(),
    type: z.enum(["block", "section"]),
  }),
  outputSchema: z.object({
    component: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
        type: z.enum(["block", "section"]),
        // tags: z.string().array(),
      })
    ),
  }),
  execute: async ({ context }) => {
    return {
      component: [
        {
          id: "hero-1",
          name: "Hero 1",
          description: "A hero for a landing page",
          type: "section" as const,
        },
      ],
    };
  },
});
