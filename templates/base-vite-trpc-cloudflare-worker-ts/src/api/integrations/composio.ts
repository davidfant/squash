import { Composio } from "@composio/core";
import { VercelProvider } from "@composio/vercel";
import { env } from "cloudflare:workers";

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
  console.log(JSON.stringify({ message: `Tool call started`, ...params }));

  try {
    const res = await composio.tools.execute(params.tool, {
      userId: params.userId,
      arguments: params.input as Record<string, unknown>,
    });

    console.log(
      JSON.stringify({
        message: `Tool call completed`,
        ...params,
        successful: res.successful,
        error: res.error,
        data: res.data,
      })
    );

    return {
      successful: res.successful,
      error: res.error,
      data: res.data as Output,
    };
  } catch (error) {
    console.error(
      JSON.stringify({
        message: `Tool call failed`,
        ...params,
        error: error instanceof Error ? error.message : String(error),
      })
    );
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
