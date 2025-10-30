import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export const createDatabase = (env: CloudflareBindings) => {
  const dbUrl = env.DATABASE_URL;
  const isNeon = dbUrl.includes("neon.tech") || dbUrl.includes("neon");

  if (isNeon) {
    return drizzleNeon<typeof schema>(neon(dbUrl), { schema });
  } else {
    return drizzlePostgres<typeof schema>(postgres(dbUrl), { schema });
  }
};

export type Database = ReturnType<typeof createDatabase>;
