import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import tsconfigPaths from "vite-tsconfig-paths";

const wrangler = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "wrangler.jsonc"), "utf8")
);
const wranglerEnv = Object.assign(
  {},
  wrangler.vars,
  wrangler.env?.[process.env.NODE_ENV!]?.vars
);
Object.assign(process.env, wranglerEnv);

export default defineConfig({
  plugins: [react(), cloudflare(), tailwindcss(), tsconfigPaths(), dts()],
});
