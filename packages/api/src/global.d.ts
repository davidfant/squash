import type { R2Bucket } from "@cloudflare/workers-types";

declare global {
  interface CloudflareBindings {
    REPOS: R2Bucket;
    [key: string]: any;
  }
}

export {};
