import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { unstable_getVarsForDev } from "wrangler";

function injectCloudflareDevVars() {
  try {
    const vars = unstable_getVarsForDev(
      resolve(process.cwd(), "wrangler.json"),
      undefined,
      {},
      process.env.CLOUDFLARE_ENV ?? process.env.WORKER_ENV,
      true
    );
    Object.assign(process.env, vars);
  } catch (error) {
    console.warn(
      "[vite] Failed to load Cloudflare .dev.vars values for the client bundle",
      error
    );
  }
}

export default defineConfig(({ mode }) => {
  if (mode === "development") {
    injectCloudflareDevVars();
  }

  return {
    plugins: [react(), cloudflare(), tailwindcss(), tsconfigPaths()],
    server: { hmr: { overlay: false } },
  };
});
