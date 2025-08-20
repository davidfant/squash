import { openai } from "@ai-sdk/openai";
import { type LanguageModel } from "ai";

export type AIComponentNamingConfig = {
  enabled: boolean;
  model: LanguageModel;
};

export const config = {
  componentNaming: {
    enabled: true,
    model: openai("gpt-5-nano"),
    // model: wrapLanguageModel({
    //   model: openai("gpt-5-nano"),
    //   middleware: filesystemCacheMiddleware(),
    // }),
    // model: openai("gpt-5-nano"),
  } as AIComponentNamingConfig,
};

export type AppConfig = typeof config;
