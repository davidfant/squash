import z from "zod";

export const zExplanation = z
  .string()
  .optional()
  .describe(
    "One sentence explanation as to why this tool is being used, and how it contributes to the goal."
  );
