import { createMiddleware } from "hono/factory";
import { createDatabase, type Database } from ".";

export const databaseMiddleware = createMiddleware<{
  Bindings: CloudflareBindings;
  Variables: { db: Database };
}>(async (c, next) => {
  c.set("db", createDatabase(c.env));
  await next();
});
