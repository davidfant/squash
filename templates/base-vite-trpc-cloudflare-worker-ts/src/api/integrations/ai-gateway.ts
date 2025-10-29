import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModelV2 } from "@ai-sdk/provider";
import { env } from "cloudflare:workers";

// don't change the gateway configuration
export const gateway: (modelId: string) => LanguageModelV2 = createOpenAI({
  baseURL: env.AI_GATEWAY_BASE_URL,
  apiKey: "",
  headers: {
    "cf-aig-authorization": `Bearer ${env.AI_GATEWAY_API_KEY}`,
    Authorization: "",
  },
}).chat;
