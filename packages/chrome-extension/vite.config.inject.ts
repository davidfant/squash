import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  build: {
    outDir: "dist/src",
    emptyOutDir: false,
    lib: {
      entry: "src/page/inject.ts",
      name: "Inject",
      formats: ["iife"],
      fileName: () => "page/inject.js",
    },
    rollupOptions: { output: { inlineDynamicImports: true } },
    // sourcemap: true,
  },
});
