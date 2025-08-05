export class FlyAPIError extends Error {}

export async function flyFetch(
  path: string,
  apiKey: string,
  init: RequestInit = {}
) {
  const res = await fetch(`https://api.machines.dev/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new FlyAPIError(
      `Request failed with status ${res.status} ${res.statusText}: ${text}`
    );
  }
  return res;
}

export async function flyFetchJson<T>(
  path: string,
  apiKey: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await flyFetch(path, apiKey, init);
  return (await res.json()) as T;
}
