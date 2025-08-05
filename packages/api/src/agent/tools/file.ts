import type { SandboxRuntimeContext } from "@/agent/types";
import * as FlyioExec from "@/lib/flyio/exec";
import { tool } from "ai";
import { z } from "zod";
import { zExplanation } from "./common";

// TODO: download tool?

// - Do NOT use this tool if the file contents have already been provided in <useful-context>
export const readFile = (ctx: SandboxRuntimeContext) =>
  tool({
    description: `
Use this tool to read the contents of a file. The output of this tool will be the 1-indexed file contents from the start line index to the end line index inclusive, together with a summary of the lines outside the line range. The file path should be relative to the project root. You can optionally specify line ranges to read using the lines parameter (e.g., "301-700, 1001-1500"). By default, the first 500 lines are read if lines is not specified.

IMPORTANT GUIDELINES:
- Do NOT specify line ranges unless the file is very large (>500 lines) - rely on the default behavior which shows the first 500 lines
- Only use line ranges when you need to see specific sections of large files that weren't shown in the default view
- If you need to read multiple files, invoke this tool multiple times in parallel (not sequentially) for efficiency
- When using this tool to gather information, it's your responsibility to ensure you have the COMPLETE context. Specifically, each time you call this command you should:
1) Assess if the contents you viewed are sufficient to proceed with your task.
2) Take note of where there are lines not shown.
3) If the file contents you have viewed are insufficient, and you suspect they may be in lines not shown, proactively call the tool again to view those lines.
4) When in doubt, call this tool again to gather more information. Remember that partial file views may miss critical dependencies, imports, or functionality.
    `.trim(),
    inputSchema: z.object({
      path: z.string().describe("The relative path of the file to read"),
      lines: z
        .object({ start: z.number(), end: z.number() })
        .optional()
        .describe(
          "The lines to read, e.g. { start: 1, end: 100 } or { start: 501, end: 1000 }"
        ),
      explanation: zExplanation,
    }),
    outputSchema: z.union([
      z.object({
        success: z.literal(true),
        content: z.string(),
        lines: z.object({
          start: z.number(),
          end: z.number(),
          total: z.number(),
        }),
      }),
      z.object({ success: z.literal(false), message: z.string() }),
    ]),
    execute: async ({ path, lines }) => {
      const start = Math.max(lines?.start ?? 1, 1);
      const end = Math.min(lines?.end ?? 500, start + 500);

      const result = await FlyioExec.readFile(path, ctx.sandbox, {
        start,
        end,
      });
      if (!result.success) return result;
      return {
        success: true,
        content: result.content,
        lines: { start, end, total: result.totalLines },
      };
    },
  });

export const writeFile = tool({
  description: `
Use this tool to propose an edit to an existing file or create a new file.

This will be read by a less intelligent model, which will quickly apply the edit. You should make it clear what the edit is, while also minimizing the unchanged code you write.
When writing the edit, you should specify each edit in sequence, with the special comment \`// ... existing code ...\` to represent unchanged code in between edited lines.

For example:

\`\`\`
// ... existing code ...
FIRST_EDIT
// ... existing code ...
SECOND_EDIT
// ... existing code ...
THIRD_EDIT
// ... existing code ...
\`\`\`

You should still bias towards repeating as few lines of the original file as possible to convey the change. But, each edit should contain sufficient context of unchanged lines around the code you're editing to resolve ambiguity.

DO NOT omit spans of pre-existing code (or comments) without using the \`// ... existing code ...\` comment to indicate the omission. If you omit the existing code comment, the model may inadvertently delete these lines.

Make sure it is clear what the edit should be, and where it should be applied.To create a new file, simply specify the content of the file in the \`code_edit\` field.

You should specify the following arguments before the others: [path]
`.trim(),
  inputSchema: z.object({
    path: z
      .string()
      .describe(
        "The relative path of the target file to modify. Always specify the path as the first argument."
      ),
    instruction: z
      .string()
      .describe(
        "A single sentence instruction describing what you are going to do for the sketched edit. This is used to assist the less intelligent model in applying the edit. Please use the first person to describe what you are going to do. Don't repeat what you have said previously in normal messages. And use it to disambiguate uncertainty in the edit."
      ),
    codeEdit: z
      .string()
      .describe(
        "Specify ONLY the precise lines of code that you wish to edit. **NEVER specify or write out unchanged code**. Instead, represent all unchanged code using the comment of the language you're editing in - example: `// ... existing code ...`"
      ),
    explanation: zExplanation,
  }),
  // outputSchema: z.object({ success: z.boolean(), message: z.string() }),
  // execute: async ({ path, codeEdit }) => FlyioExec.writeFile(path, codeEdit, ctx.context),
  execute: async ({ path }) => ({ status: "staged", path }),
});

export const deleteFile = tool({
  description: `
Deletes a file at the specified path. The operation will fail gracefully if:
- The file doesn't exist
- The operation is rejected for security reasons
- The file cannot be deleted
`.trim(),
  inputSchema: z.object({
    path: z
      .string()
      .describe(
        "The path of the file to delete, relative to the workspace root."
      ),
    explanation: zExplanation,
  }),
  // outputSchema: z.object({ success: z.boolean(), message: z.string() }),
  // execute: ({ path }) => FlyioExec.deleteFile(path, ctx.context),
  execute: ({ path }) => ({ status: "staged", path }),
});
