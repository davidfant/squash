import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { ImageModelV2 } from "@ai-sdk/provider";
import {
  experimental_generateImage as _generateImage,
  generateObject as _generateObject,
  generateText as _generateText,
  LanguageModel,
} from "ai";
import { env } from "cloudflare:workers";
import { randomUUID } from "crypto";
import { logger } from "../logger";

const settings = {
  apiKey: "",
  headers: {
    "cf-aig-authorization": `Bearer ${env.AI_GATEWAY_API_KEY}`,
    Authorization: "",
  },
};

// don't change the gateway configuration
export const openai = createOpenAI({
  baseURL: `${env.AI_GATEWAY_BASE_URL}/openai`,
  ...settings,
});

export const anthropic = createAnthropic({
  baseURL: `${env.AI_GATEWAY_BASE_URL}/anthropic`,
  ...settings,
});

export const google = createGoogleGenerativeAI({
  baseURL: `${env.AI_GATEWAY_BASE_URL}/google-ai-studio/v1beta`,
  ...settings,
});

const formatModel = (model: LanguageModel | ImageModelV2) =>
  typeof model === "string"
    ? { provider: null, id: model }
    : { provider: model.provider, id: model.modelId };

type Content =
  | { type: "text"; text: string }
  | { type: "image" }
  | { type: "object"; object: unknown };

export const generateText: typeof _generateText = async (...args) => {
  const id = randomUUID();
  const { prompt, model, tools } = args[0];
  logger.debug("Start generateText", {
    event: "ai-gateway-generate-input",
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
    const content: Content[] = res.content
      .map((part): Content | undefined => {
        if (part.type === "text") {
          return { type: "text", text: part.text };
        }
        if (part.type === "file") {
          return { type: "image" };
        }
        return undefined;
      })
      .filter((part) => part !== undefined);
    logger.debug("Completed generateText", {
      event: "ai-gateway-generate-output",
      id,
      content,
    });
    return res;
  } catch (e) {
    logger.error("Error generateText", {
      id,
      type: "ai-gateway-generate-error",
      error: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }
};

export const generateObject: typeof _generateObject = async (...args) => {
  const id = randomUUID();
  const { prompt, model } = args[0];
  logger.debug("Start generateObject", {
    event: "ai-gateway-generate-input",
    id,
    prompt,
    model: formatModel(model),
  });

  try {
    const res = await _generateObject(...args);
    logger.debug("Completed generateObject", {
      event: "ai-gateway-generate-output",
      id,
      content: [{ type: "object", object: res.object }] satisfies Content[],
    });
    return res;
  } catch (e) {
    logger.error("Error generateObject", {
      id,
      event: "ai-gateway-generate-error",
      error: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }
};

export const generateImage: typeof _generateImage = async (...args) => {
  const id = randomUUID();
  const { prompt, model } = args[0];
  logger.debug("Start generateImage", {
    event: "ai-gateway-generate-input",
    id,
    prompt,
    model: formatModel(model),
  });

  try {
    const res = await _generateImage(...args);
    logger.debug("Completed generateImage", {
      event: "ai-gateway-generate-output",
      id,
      content: res.images.map(() => ({ type: "image" })) satisfies Content[],
    });
    return res;
  } catch (e) {
    logger.error("Error generateImage", {
      id,
      event: "ai-gateway-generate-error",
      error: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }
};
