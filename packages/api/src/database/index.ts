import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema/auth";

export const createDatabase = (env: CloudflareBindings) =>
  drizzle<typeof schema>(neon(env.DATABASE_URL), { schema });
export type Database = ReturnType<typeof createDatabase>;
