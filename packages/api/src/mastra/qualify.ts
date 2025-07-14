import { google } from "@ai-sdk/google";
import { Agent } from "@mastra/core/agent";

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
    // memory,
  });
};
