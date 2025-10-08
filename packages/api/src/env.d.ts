export {};

declare global {
  interface CloudflareBindings {
    AGENT_SESSIONS: R2Bucket;
  }
}
