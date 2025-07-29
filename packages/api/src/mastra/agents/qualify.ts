import { google } from "@ai-sdk/google";
import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const createQualifyAgent = (databaseUrl: string): Agent => {
  // const memory = new Memory({
  //   storage: new PostgresStore({ connectionString: databaseUrl }),
  //   vector: new PgVector({ connectionString: databaseUrl }),
  //   options: { lastMessages: 10 },
  // });

  return new Agent({
    name: "Qualify Agent",
    instructions:
      "You are a helpful assistant that can help with qualifying leads. You are given a lead and you need to qualify them.",
    model: google("gemini-2.5-flash"),
    tools: {
      weather: createTool({
        id: "Get Weather Information",
        inputSchema: z.object({ city: z.string() }),
        description: `Fetches the current weather information for a given city`,
        execute: async ({ context: { city } }) => {
          // Tool logic here (e.g., API call)
          console.log("Using tool to fetch weather information for", city);
          return { temperature: 20, conditions: "Sunny" }; // Example return
        },
      }),
    },
    // memory,
  });
};
