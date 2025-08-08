export type AIComponentNamingConfig = {
  enabled: boolean;
  provider: "openai";
  model: string; // e.g., "gpt-5-nano"
};

export const config = {
  aiComponentNaming: {
    buttons: {
      enabled: true,
      provider: "openai",
      model: "gpt-5-nano",
    } as AIComponentNamingConfig,
  },
};

export type AppConfig = typeof config;
