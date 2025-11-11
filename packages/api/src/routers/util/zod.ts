import { z } from "zod";

export const zUserMessagePart = z.union([
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({
    type: z.literal("data-AgentState"),
    data: z.union([
      z.object({ type: z.literal("implement") }),
      z.object({ type: z.literal("discover") }),
    ]),
  }),
  z.object({
    type: z.literal("file"),
    mediaType: z.string(),
    filename: z.string().optional(),
    url: z.string(),
  }),
]);
