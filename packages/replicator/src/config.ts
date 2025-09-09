import { openai } from "@ai-sdk/openai";
import { wrapLanguageModel, type LanguageModel } from "ai";
import { filesystemCacheMiddleware } from "./lib/ai/filesystemCacheMiddleware";

export type AIComponentNamingConfig = {
  enabled: boolean;
  model: LanguageModel;
};

export const config = {
  componentNaming: {
    enabled: true,
    // model: openai("gpt-5-nano"),
    model: wrapLanguageModel({
      model: openai("gpt-5-nano"),
      middleware: filesystemCacheMiddleware(),
    }),
  } as AIComponentNamingConfig,
};

export type AppConfig = typeof config;
