import manifest from "@/manifest.config";
import { crx } from "@crxjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss(), crx({ manifest })],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    // port: 5174,
    // strictPort: true,
    // hmr: { protocol: "ws", host: "localhost", port: 5174 },
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  },
  build: {
    outDir: "dist", // Changed from 'build' to 'dist' - CRXJS expects this
    sourcemap: true,
  },
});
