import { crx } from "@crxjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import manifest from "./src/manifest.config";

export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths(), crx({ manifest })],
});
