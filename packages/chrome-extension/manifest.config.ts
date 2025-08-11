// manifest.config.ts
import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "Chrome Extension Vite Shadcn UI Starter",
  version: "0.0.0",
  description:
    "A modern, TypeScript-powered Chrome extension starter with React and Shadcn/UI",
  action: {
    default_popup: "index.html",
  },
  background: {
    service_worker: "src/background.ts",
    type: "module",
  },
  permissions: ["scripting", "downloads", "activeTab", "storage", "tabs"],
  host_permissions: ["<all_urls>"],
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content-script.ts"],
      run_at: "document_start",
    },
  ],
  content_security_policy: {
    extension_pages:
      "script-src 'self'; object-src 'self'; connect-src 'self' http://localhost:5174 ws://localhost:5174 http://localhost:8787",
  },
});
