import { z } from "zod";

const parseJson = (val: unknown) => {
  if (typeof val !== "string") return val;
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
};

export const PromptSchema = z.array(
  z.union([
    z.object({
      type: z.literal("text"),
      text: z.string(),
    }),
    z.object({
      type: z.literal("image"),
      image: z.string(),
      mediaType: z.string().optional(),
    }),
    z.object({
      type: z.literal("file"),
      data: z.string(),
      filename: z.string().optional(),
      mediaType: z.string(),
    }),
  ])
);

export const ClaudeCodeSessionSchema = z.object({
  id: z.string(),
  steps: z.array(z.record(z.string(), z.any())),
});

export const ClaudeCodeOptionsSchema = z.object({
  appendSystemPrompt: z.string().optional(),
});

export const ClaudeCodeCLIOptionsSchema = z.object({
  agent: z.enum(["claude-code"]),
  prompt: z.preprocess(parseJson, PromptSchema),
  session: z.preprocess(parseJson, ClaudeCodeSessionSchema).optional(),
  options: z.preprocess(parseJson, ClaudeCodeOptionsSchema).optional(),
  cwd: z.string().default(process.cwd()),
});

export const CLIOptionsSchema = ClaudeCodeCLIOptionsSchema;

export type ClaudeCodeCLIOptions = z.infer<typeof ClaudeCodeCLIOptionsSchema>;
export type ClaudeCodeOptions = z.infer<typeof ClaudeCodeOptionsSchema>;
export type CLIOptions = z.infer<typeof CLIOptionsSchema>;
export type Prompt = z.infer<typeof PromptSchema>;
export type ClaudeCodeSession = z.infer<typeof ClaudeCodeSessionSchema>;
