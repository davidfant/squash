import { Composio } from "@composio/core";
import { VercelProvider } from "@composio/vercel";
import { env } from "cloudflare:workers";
import { randomUUID } from "crypto";
import { logger } from "../logger";

export const composio = new Composio({ apiKey: env.COMPOSIO_API_KEY });

export async function executeTool<Input, Output>(params: {
  tool: string;
  userId: string;
  input: Input;
}): Promise<{
  successful: boolean;
  error: string | null;
  data: Output;
}> {
  const toolCallId = randomUUID();
  logger.debug("Tool call started", {
    type: "composio-tool-call",
    id: toolCallId,
    tool: params.tool,
    userId: params.userId,
    input: params.input,
  });

  try {
    const res = await composio.tools.execute(params.tool, {
      userId: params.userId,
      arguments: params.input as Record<string, unknown>,
    });

    logger.debug("Tool call completed", {
      type: "composio-tool-result",
      id: toolCallId,
      successful: res.successful,
      error: res.error,
      data: res.data,
    });

    return {
      successful: res.successful,
      error: res.error,
      data: res.data as Output,
    };
  } catch (error) {
    logger.error("Tool call error", {
      type: "composio-tool-error",
      id: toolCallId,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      successful: false,
      error: error.message,
      data: null as any,
    };
  }
}

export function getAIGatewayTools(userId: string, toolSlugs: string[]) {
  return new Composio({
    apiKey: env.COMPOSIO_API_KEY,
    provider: new VercelProvider(),
  }).tools.get(userId, { tools: toolSlugs });
}
