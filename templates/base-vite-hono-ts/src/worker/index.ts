import { Hono } from "hono";

const app = new Hono<{ Bindings: Env }>().get("/", (c) =>
  c.json({ name: "API" })
);
export default new Hono().route("/api", app);
export type AppType = typeof app;
