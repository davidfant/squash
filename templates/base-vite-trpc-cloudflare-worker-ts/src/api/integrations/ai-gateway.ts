import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModelV2 } from "@ai-sdk/provider";
import {
  generateObject as _generateObject,
  generateText as _generateText,
  LanguageModel,
} from "ai";
import { env } from "cloudflare:workers";
import { randomUUID } from "crypto";
import { logger } from "../logger";

// don't change the gateway configuration
export const gateway: (modelId: string) => LanguageModelV2 = createOpenAI({
  baseURL: env.AI_GATEWAY_BASE_URL,
  apiKey: "",
  headers: {
    "cf-aig-authorization": `Bearer ${env.AI_GATEWAY_API_KEY}`,
    Authorization: "",
  },
}).chat;

const formatModel = (model: LanguageModel) =>
  typeof model === "string" ? model : model.modelId;

export const generateText: typeof _generateText = async (...args) => {
  const id = randomUUID();
  const { prompt, model, tools } = args[0];
  logger.debug("Start generateText", {
    type: "ai-gateway-generate-text-input",
    id,
    prompt,
    model: formatModel(model),
    tools: Object.entries(tools ?? {}).map(([name, tool]) => ({
      name,
      description: tool.description,
    })),
  });

  try {
    const res = await _generateText(...args);
    logger.debug("Completed generateText", {
      type: "ai-gateway-generate-text-output",
      id,
      text: res.text,
    });
    return res;
  } catch (e) {
    logger.error("Error generateText", {
      id,
      type: "ai-gateway-generate-text-error",
      error: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }
};

export const generateObject: typeof _generateObject = async (...args) => {
  const id = randomUUID();
  const { prompt, model } = args[0];
  logger.debug("Start generateObject", {
    type: "ai-gateway-generate-object-input",
    id,
    prompt,
    model: formatModel(model),
  });

  try {
    const res = await _generateObject(...args);
    logger.debug("Completed generateObject", {
      type: "ai-gateway-generate-object-output",
      id,
      object: res.object,
    });
    return res;
  } catch (e) {
    logger.error("Error generateObject", {
      id,
      type: "ai-gateway-generate-object-error",
      error: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }
};
