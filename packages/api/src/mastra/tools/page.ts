import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const createPage = createTool({
  id: "createPage",
  description:
    "Create a page with sections, either from the component registry or from existing sections.",
  inputSchema: z.object({
    name: z.string(),
    path: z.string(),
    sections: z.array(
      z.object({
        name: z.string(),
        source: z.union([
          z.object({
            type: z.literal("registry"),
            itemId: z
              .string()
              .describe("The id of the regitry section component to add"),
          }),
          z.object({
            type: z.literal("code"),
            sectionId: z
              .string()
              .describe("The id of the existing section to add"),
          }),
        ]),
      })
    ),
  }),
  outputSchema: z.object({
    id: z.string().describe("The id of the page"),
    name: z.string(),
    path: z.string(),
    filePath: z.string(),
    sectionIds: z.array(z.string()),
  }),
});
