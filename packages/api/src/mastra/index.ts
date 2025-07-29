import { Mastra } from "@mastra/core/mastra";
import { createQualifyAgent } from "./agents/qualify";

export const mastra: Mastra = new Mastra({
  agents: {
    qualifyAgent: createQualifyAgent(process.env.DATABASE_URL!),
  },
});
