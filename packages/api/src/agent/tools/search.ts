import type { AgentRuntimeContext } from "@/agent/types";
import { gitGrep } from "@/lib/flyio/exec";
import { tool } from "ai";
import { z } from "zod";
import { zExplanation } from "./common";

// TODO: semantic search...

export const grepSearch = (ctx: AgentRuntimeContext) =>
  tool({
    description: `
Search the codebase for exact text matches or regex patterns.
This is preferred over semantic search when we know the exact symbol/function name/etc. to search in some set of directories/file types.

Use this tool to run fast, exact regex searches over text files using \`git grep\`. To avoid overwhelming output, the results are capped at 50 matches. Use the include or exclude patterns to filter the search scope by file type or specific paths.

- Always escape special regex characters: ( ) [ ] { } + * ? ^ $ | . \
- Use \`\\\` to escape any of these characters when they appear in your search string.
- Do NOT perform fuzzy or semantic matches.
- Return only a valid regex pattern string.

### Examples:
| Literal               | Regex Pattern            |
|-----------------------|--------------------------|
| function(             | function\(               |
| value[index]          | value\[index\]           |
| file.txt              | file\.txt                |
| user|admin            | user\|admin              |
| path\to\file          | path\\to\\file           |
| hello world           | hello world              |
| foo\(bar\)            | foo\\(bar\\)             |
`.trim(),
    inputSchema: z.object({
      query: z.string().describe("The query to search for."),
      caseSensitive: z
        .boolean()
        .describe("Whether the search should be case sensitive"),
      includePattern: z
        .string()
        .optional()
        .describe(
          "Glob pattern for files to include (e.g. '*.ts' for TypeScript files)"
        ),
      excludePattern: z
        .string()
        .optional()
        .describe("Glob pattern for files to exclude"),
      explanation: zExplanation,
    }),
    outputSchema: z.union([
      z.object({
        success: z.literal(true),
        matches: z.object({ path: z.string(), snippet: z.string() }).array(),
      }),
      z.object({ success: z.literal(false), message: z.string() }),
    ]),
    execute: ({ query, ...options }) => gitGrep(query, ctx.sandbox, options),
  });
