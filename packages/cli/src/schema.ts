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
  z.object({ type: z.literal("text"), text: z.string() })
);
// export const PromptSchema = z.array(
//   z.union([
//     z.object({ type: z.literal('text'), text: z.string() }),
//     z.object({ type: z.literal('image'), url: z.string() }),
//   ])
// );

export const ClaudeCodeSessionSchema = z.object({
  id: z.string(),
  steps: z.array(z.record(z.string(), z.any())),
});

export const ClaudeCodeCLIOptionsSchema = z.object({
  agent: z.enum(["claude-code"]),
  prompt: z.preprocess(parseJson, PromptSchema),
  session: z.preprocess(parseJson, ClaudeCodeSessionSchema).optional(),
  cwd: z.string().default(process.cwd()),
});

export const CLIOptionsSchema = ClaudeCodeCLIOptionsSchema;

export type ClaudeCodeCLIOptions = z.infer<typeof ClaudeCodeCLIOptionsSchema>;
export type CLIOptions = z.infer<typeof CLIOptionsSchema>;
export type Prompt = z.infer<typeof PromptSchema>;
export type ClaudeCodeSession = z.infer<typeof ClaudeCodeSessionSchema>;
