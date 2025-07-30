import type { Database } from "@/database";
import {
  staticPageFileContent,
  staticSectionFileContent,
} from "@/lib/repo/static";
import { uploadFiles } from "@/lib/repo/uploadFiles";
import type { Sandbox } from "@daytonaio/sdk";
import type { RuntimeContext } from "@mastra/core/runtime-context";
import { createTool } from "@mastra/core/tools";
import camelCase from "lodash.camelcase";
import upperFirst from "lodash.upperfirst";
import { z } from "zod";

const n = (id: string) => upperFirst(camelCase(id));

export type RepoRuntimeContext = RuntimeContext<{
  db: Database;
  projectId: string;
  daytona: { sandbox: Sandbox; apiKey: string };
}>;

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
        description: z.string(),
        source: z.union([
          z.object({
            type: z.literal("registry"),
            itemId: z
              .string()
              .describe("The id of the registry section component to add"),
          }),
          z.object({
            type: z.literal("reuse"),
            path: z
              .string()
              .describe(
                "The file path of the existing section to reuse, starting with 'src/...'"
              ),
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
  execute: async ({ context: page, runtimeContext: c }) => {
    const daytona = (c as RepoRuntimeContext).get("daytona");

    // for each section w source registry, install it

    const registryItemIds = new Set(
      page.sections
        .map((s) => s.source)
        .filter((s) => s.type === "registry")
        .map((s) => s.itemId)
    );
    // TODO: get all registry item id file contents...
    const contentByItemId = [...registryItemIds].reduce(
      (acc, id) => ({
        ...acc,
        [id]: [
          // TODO: should this name be e.g. "default variant" or similar, that explains wth this is to the user?
          `export const name = ${JSON.stringify(id)};`,
          `export default () => <div>Registry item ${id}</div>`,
          "",
        ].join("\n"),
      }),
      {} as Record<string, string>
    );

    const sections = page.sections.map((s) => {
      if (s.source.type === "reuse") {
        return { filesToUpload: [], sectionPath: s.source.path };
      } else {
        const sectionDir = `src/sections/${n(s.name)}`;
        const variantFilePath = `${sectionDir}/${n(s.name)}1.tsx`;
        const sectionFilePath = `${sectionDir}/index.ts`;

        const sectionContent = staticSectionFileContent({
          name: s.name,
          variantFilePath,
        });
        const variantContent = contentByItemId[s.source.itemId]!;
        return {
          filesToUpload: [
            { content: variantContent, path: variantFilePath },
            { content: sectionContent, path: sectionFilePath },
          ],
          sectionPath: sectionDir,
        };
      }
    });

    const pagePath = `src/pages/${
      page.path.replace(/^\//g, "") || "index"
    }.tsx`;
    const pageContent = staticPageFileContent({
      name: page.name,
      sectionPaths: sections.map((s) => s.sectionPath),
    });

    await uploadFiles(
      [
        { content: pageContent, path: pagePath },
        ...sections.flatMap((s) => s.filesToUpload),
      ],
      { sandboxId: daytona.sandbox.id, apiKey: daytona.apiKey }
    );

    return {
      id: "123",
      name: page.name,
      path: page.path,
      filePath: page.path,
      sectionIds: sections.map((s) => s.sectionPath),
    };
  },
});
