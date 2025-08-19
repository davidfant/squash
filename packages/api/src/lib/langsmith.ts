import { Client } from "langsmith";
import { initializeOTEL } from "langsmith/experimental/otel/setup";
import { wrapAISDKModel } from "langsmith/wrappers/vercel";

let langsmithClient: Client | null = null;

export function getLangsmithClient(env: CloudflareBindings): Client | null {
  // Only initialize if tracing is enabled
  if (env.LANGSMITH_TRACING !== "true") {
    return null;
  }

  if (!langsmithClient) {
    initializeOTEL();

    langsmithClient = new Client({
      apiUrl: env.LANGSMITH_ENDPOINT,
      apiKey: env.LANGSMITH_API_KEY,
    });
  }

  return langsmithClient;
}

export function wrapModelWithLangsmith<T>(
  model: T,
  env: CloudflareBindings,
  metadata?: Record<string, any>
): T {
  // If tracing is not enabled, return the model as-is
  if (env.LANGSMITH_TRACING !== "true") {
    return model;
  }

  const client = getLangsmithClient(env);
  if (!client) {
    return model;
  }

  // Wrap the model with Langsmith tracing
  return wrapAISDKModel(model as any, {
    client,
    ...metadata,
  }) as T;
}
