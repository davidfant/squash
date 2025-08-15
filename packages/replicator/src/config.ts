import { openai } from "@ai-sdk/openai";
import { wrapLanguageModel, type LanguageModel } from "ai";
import { filesystemCacheMiddleware } from "./lib/filesystemCacheMiddleware";

export type AIComponentNamingConfig = {
  enabled: boolean;
  model: LanguageModel;
};

export const config = {
  componentNaming: {
    enabled: false,
    model: wrapLanguageModel({
      model: openai("gpt-5-nano"),
      middleware: filesystemCacheMiddleware(),
    }),
    // model: openai("gpt-5-nano"),
  } as AIComponentNamingConfig,
};

export type AppConfig = typeof config;
