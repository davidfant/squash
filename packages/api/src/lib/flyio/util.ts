import { logger } from "../logger";

export class FlyAPIError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.code = code;
  }
}

export async function flyFetch(
  path: string,
  accessToken: string,
  init: RequestInit = {}
) {
  let res: Response;
  try {
    res = await fetch(`https://api.machines.dev/v1${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : JSON.stringify(error);
    logger.error("Failed to reach Fly.io API", {
      path,
      method: init.method,
      error: message,
    });
    throw new FlyAPIError(`Request to ${path} failed: ${message}`, 500);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    logger.error("Fly.io API responded with an error", {
      path,
      method: init.method,
      status: res.status,
      statusText: res.statusText,
      body: text,
    });
    throw new FlyAPIError(
      `Request to ${path} failed with status ${res.status} ${res.statusText}: ${text}`,
      res.status
    );
  }
  return res;
}

export async function flyFetchJson<T>(
  path: string,
  accessToken: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await flyFetch(path, accessToken, init);
  return (await res.json()) as T;
}
