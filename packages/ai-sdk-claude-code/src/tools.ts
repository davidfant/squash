import { tool } from "ai";
import { z } from "zod";

export const tools = {
  ClaudeCode__Task: tool({
    inputSchema: z.object({
      description: z
        .string()
        .describe("A short (3-5 word) description of the task"),
      prompt: z.string().describe("The task for the agent to perform"),
      subagent_type: z
        .string()
        .describe("The type of specialized agent to use for this task"),
    }),
    outputSchema: z.unknown(),
    description:
      "Launch a new agent to handle complex, multi-step tasks autonomously.",
  }),

  ClaudeCode__Bash: tool({
    inputSchema: z.object({
      command: z.string().describe("The command to execute"),
      timeout: z
        .number()
        .optional()
        .describe("Optional timeout in milliseconds (max 600000)"),
      description: z
        .string()
        .optional()
        .describe(
          "Clear, concise description of what this command does in 5-10 words"
        ),
      run_in_background: z
        .boolean()
        .optional()
        .describe(
          "Run the command in the background and monitor with BashOutput"
        ),
    }),
    outputSchema: z.unknown(),
    description:
      "Executes a bash command in a persistent, secured shell session.",
  }),

  ClaudeCode__Glob: tool({
    inputSchema: z.object({
      pattern: z.string().describe("The glob pattern to match files against"),
      path: z
        .string()
        .optional()
        .describe(
          "The directory to search in; omit to use current working directory"
        ),
    }),
    outputSchema: z.unknown(),
    description:
      "Finds files matching a glob pattern, sorted by modification time.",
  }),

  ClaudeCode__Grep: tool({
    inputSchema: z.object({
      pattern: z.string().describe("The regex pattern to search for"),
      path: z
        .string()
        .optional()
        .describe("File or directory to search in; defaults to cwd"),
      glob: z
        .string()
        .optional()
        .describe("Glob pattern to filter files (e.g. '*.js')"),
      output_mode: z
        .enum(["content", "files_with_matches", "count"])
        .optional()
        .describe(
          "Output mode: content shows lines, files_with_matches shows paths, count shows match counts"
        ),
      "-B": z
        .number()
        .optional()
        .describe("Lines to show before each match (content mode only)"),
      "-A": z
        .number()
        .optional()
        .describe("Lines to show after each match (content mode only)"),
      "-C": z
        .number()
        .optional()
        .describe(
          "Lines to show before & after each match (content mode only)"
        ),
      "-n": z
        .boolean()
        .optional()
        .describe("Show line numbers in output (content mode only)"),
      "-i": z.boolean().optional().describe("Case-insensitive search"),
      type: z
        .string()
        .optional()
        .describe("File type to search (e.g. js, py, go)"),
      head_limit: z
        .number()
        .optional()
        .describe("Limit output to first N entries"),
      multiline: z
        .boolean()
        .optional()
        .describe("Enable multiline mode where . matches newlines"),
    }),
    outputSchema: z.unknown(),
    description: "Searches file contents with ripgrep-powered regex matching.",
  }),

  ClaudeCode__ExitPlanMode: tool({
    inputSchema: z.object({
      plan: z
        .string()
        .describe(
          "The concise plan (in markdown) you want to run by the user for approval"
        ),
    }),
    outputSchema: z.unknown(),
    description:
      "Signal that planning is complete and code implementation should begin.",
  }),

  ClaudeCode__Read: tool({
    inputSchema: z.object({
      file_path: z.string().describe("The absolute path to the file to read"),
      offset: z
        .number()
        .optional()
        .describe("Line number to start reading from"),
      limit: z.number().optional().describe("Number of lines to read"),
    }),
    outputSchema: z.unknown(),
    description:
      "Reads a file’s content (text, PDF, notebook, or image) from disk.",
  }),

  ClaudeCode__Edit: tool({
    inputSchema: z.object({
      file_path: z.string().describe("The absolute path to the file to modify"),
      old_string: z.string().describe("The text to replace"),
      new_string: z.string().describe("The text to replace it with"),
      replace_all: z
        .boolean()
        .optional()
        .describe("Replace all occurrences of old_string"),
    }),
    outputSchema: z.unknown(),
    description: "Performs a single find-and-replace edit in a file.",
  }),

  ClaudeCode__MultiEdit: tool({
    inputSchema: z.object({
      file_path: z.string().describe("The absolute path to the file to modify"),
      edits: z
        .array(
          z.object({
            old_string: z.string().describe("The text to replace"),
            new_string: z.string().describe("The text to replace it with"),
            replace_all: z
              .boolean()
              .optional()
              .describe("Replace all occurrences of old_string"),
          })
        )
        .min(1)
        .describe("Sequential list of edit operations to perform"),
    }),
    outputSchema: z.unknown(),
    description:
      "Applies multiple find-and-replace edits to a single file atomically.",
  }),

  ClaudeCode__Write: tool({
    inputSchema: z.object({
      file_path: z.string().describe("The absolute path to the file to write"),
      content: z.string().describe("The content to write to the file"),
    }),
    outputSchema: z.unknown(),
    description: "Writes (or overwrites) a file on the local filesystem.",
  }),

  ClaudeCode__NotebookEdit: tool({
    inputSchema: z.object({
      notebook_path: z
        .string()
        .describe("Absolute path to the notebook (.ipynb) to edit"),
      cell_id: z
        .string()
        .optional()
        .describe(
          "ID of the cell to edit or insert after (omit to target top of notebook)"
        ),
      new_source: z
        .string()
        .describe("The new source code or markdown for the cell"),
      cell_type: z
        .enum(["code", "markdown"])
        .optional()
        .describe("Type of cell (code or markdown)"),
      edit_mode: z
        .enum(["replace", "insert", "delete"])
        .optional()
        .describe("Whether to replace, insert, or delete the cell"),
    }),
    outputSchema: z.unknown(),
    description:
      "Replaces, inserts, or deletes a specific cell in a Jupyter notebook.",
  }),

  ClaudeCode__WebFetch: tool({
    inputSchema: z.object({
      url: z.string().url().describe("The URL to fetch content from"),
      prompt: z.string().describe("The prompt to run on the fetched content"),
    }),
    outputSchema: z.unknown(),
    description: "Fetches and analyzes webpage content using an AI model.",
  }),

  ClaudeCode__TodoWrite: tool({
    inputSchema: z.object({
      todos: z
        .array(
          z.object({
            content: z.string().min(1).describe("The todo item text"),
            status: z
              .enum(["pending", "in_progress", "completed"])
              .describe("The current state of this todo item"),
            activeForm: z.string().describe("The active form to use"),
          })
        )
        .describe("The updated list of todos"),
    }),
    outputSchema: z.string(),
    description:
      "Creates or updates a structured todo list for the current session.",
  }),

  ClaudeCode__WebSearch: tool({
    inputSchema: z.object({
      query: z.string().min(2).describe("The search query to use"),
      allowed_domains: z
        .array(z.string())
        .optional()
        .describe("Domains to include in search results"),
      blocked_domains: z
        .array(z.string())
        .optional()
        .describe("Domains to exclude from search results"),
    }),
    outputSchema: z.unknown(),
    description: "Performs a web search to retrieve up-to-date information.",
  }),

  ClaudeCode__BashOutput: tool({
    inputSchema: z.object({
      bash_id: z.string().describe("The ID of the background shell to query"),
      filter: z.string().optional().describe("Regex to filter output lines"),
    }),
    outputSchema: z.unknown(),
    description: "Retrieves new output from a running or completed Bash shell.",
  }),

  ClaudeCode__KillBash: tool({
    inputSchema: z.object({
      shell_id: z.string().describe("The ID of the background shell to kill"),
    }),
    outputSchema: z.unknown(),
    description: "Terminates a long-running Bash shell by its ID.",
  }),

  ClaudeCode__mcp__composio__GetConnectedTools: tool({
    inputSchema: z.unknown(),
    outputSchema: z.unknown(),
  }),
  ClaudeCode__mcp__composio__MultiExecuteTool: tool({
    inputSchema: z.object({
      toolCalls: z.array(
        z.object({
          toolSlug: z.string(),
          arguments: z.record(z.string(), z.any()),
          reason: z.string(),
        })
      ),
    }),
    outputSchema: z.unknown(),
  }),
  ClaudeCode__mcp__composio__WaitForConnection: tool({
    inputSchema: z.object({ connectRequestId: z.string() }),
    outputSchema: z.string(),
  }),
  ClaudeCode__mcp__composio__CheckConnectionStatus: tool({
    inputSchema: z.unknown(),
    outputSchema: z.unknown(),
  }),
  ClaudeCode__mcp__composio__SearchTools: tool({
    inputSchema: z.object({ useCase: z.string() }),
    outputSchema: z.unknown(),
  }),
  ClaudeCode__mcp__composio__ConnectToToolkit: tool({
    inputSchema: z.object({ toolkitSlug: z.string() }),
    outputSchema: z.string(),
    //   outputSchema: z.preprocess(
    //     (data) => {
    //       try {
    //         return JSON.parse(data);
    //       } catch (error) {
    //         return z.NEVER;
    //       }
    //     },
    //     z.object({
    //       redirectUrl: z.string(),
    //       connectRequestId: z.string(),
    //       toolkit: z.object({
    //         name: z.string(),
    //         logoUrl: z.string(),
    //         authConfigId: z.string(),
    //       }),
    //     })
    //   ),
  }),
};

export type ClaudeCodeTools = typeof tools;
