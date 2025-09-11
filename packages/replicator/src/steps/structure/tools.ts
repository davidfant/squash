import type { Metadata } from "@/types";
import { tool } from "ai";
import z from "zod";

export const createStructureComponentsTool = (
  componentIds: Metadata.ReactFiber.ComponentId[]
) =>
  tool({
    description:
      "Use this tool to structure and organize React components into appropriate directory hierarchies.",
    inputSchema: z.object(
      Object.fromEntries(
        componentIds.map((id) => [
          id,
          z.object({
            name: z.string().describe("Unique PascalCase component name"),
            directory: z
              .string()
              .describe(
                "Target directory path (e.g., 'ui/primitives', 'ui/blocks/dashboard')"
              ),
          }),
        ])
      )
    ),
    execute: async (input) => {
      // Validate that all component names are unique
      const components = Object.values(input);
      const names = components.map((c) => c.name);
      const uniqueNames = new Set(names);

      if (names.length !== uniqueNames.size) {
        const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
        throw new Error(
          `Duplicate component names found: ${duplicates.join(", ")}. All component names must be unique.`
        );
      }

      // Validate directory paths
      // const validDirectories = [
      //   "ui/primitives",
      //   "ui/icons",
      //   "ui/components",
      //   "ui/blocks",
      //   "pages"
      // ];

      // for (const component of input.components) {
      //   const isValidDirectory = validDirectories.some(dir =>
      //     component.directory === dir ||
      //     component.directory.startsWith(dir + "/")
      //   );

      //   if (!isValidDirectory) {
      //     throw new Error(`Invalid directory "${component.directory}" for component "${component.name}". Must be one of: ${validDirectories.join(", ")} or a subdirectory of ui/blocks.`);
      //   }
      // }

      return { ok: true };
    },
  });
