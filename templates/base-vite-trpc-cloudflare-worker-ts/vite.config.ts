import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import dotenv from "dotenv";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

dotenv.config({ path: resolve(process.cwd(), ".dev.vars") });

export default defineConfig({
  plugins: [react(), cloudflare(), tailwindcss(), tsconfigPaths()],
  server: { hmr: { overlay: false } },
});
