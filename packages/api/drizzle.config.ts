import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH ?? ".env" });

export default defineConfig({
  out: "./drizzle",
  schema: "./src/database/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
  verbose: true,
});
