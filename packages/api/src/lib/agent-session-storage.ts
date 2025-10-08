import { env } from "cloudflare:workers";
import { logger } from "./logger";

type StoreAgentSessionParams = {
  sessionId: string;
  threadId: string;
  data: string;
};

type GetAgentSessionParams = {
  objectKey: string;
};

const BUCKET_PREFIX = "threads";

export async function storeAgentSessionData({
  sessionId,
  threadId,
  data,
}: StoreAgentSessionParams): Promise<string> {
  const key = `${BUCKET_PREFIX}/${threadId}/${sessionId}.jsonl`;
  logger.debug("Storing agent session in R2", { sessionId, threadId, key });
  await env.AGENT_SESSIONS.put(key, data, {
    httpMetadata: { contentType: "application/json" },
  });
  return key;
}

export async function readAgentSessionData({
  objectKey,
}: GetAgentSessionParams): Promise<string> {
  logger.debug("Fetching agent session from R2", { objectKey });
  const object = await env.AGENT_SESSIONS.get(objectKey);
  if (!object) {
    throw new Error(`Agent session not found at ${objectKey}`);
  }
  return await object.text();
}
