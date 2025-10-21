import { Composio } from "@composio/core";
import { VercelProvider } from "@composio/vercel";
import { env } from "cloudflare:workers";

export const composio = new Composio({ apiKey: env.COMPOSIO_API_KEY });

export async function executeTool<
  Input extends Record<string, unknown>,
  Output extends Record<string, unknown>
>(params: {
  tool: string;
  userId: string;
  input: Input;
}): Promise<{
  successful: boolean;
  error: string | null;
  data: Output;
}> {
  const res = await composio.tools.execute(params.tool, {
    userId: params.userId,
    arguments: params.input,
  });

  return {
    successful: res.successful,
    error: res.error,
    data: res.data as Output,
  };
}

export function getAIGatewayTools(userId: string, toolSlugs: string[]) {
  return new Composio({
    apiKey: env.COMPOSIO_API_KEY,
    provider: new VercelProvider(),
  }).tools.get(userId, { tools: toolSlugs });
}
