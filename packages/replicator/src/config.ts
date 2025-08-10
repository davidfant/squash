export type AIComponentNamingConfig = {
  enabled: boolean;
  provider: "openai";
  model: string; // e.g., "gpt-5-nano"
};

export const config = {
  componentNaming: {
    enabled: false,
    provider: "openai",
    model: "gpt-5-nano",
  } as AIComponentNamingConfig,
};

export type AppConfig = typeof config;
