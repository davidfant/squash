export class FlyAPIError extends Error {}

export async function flyFetch<T>(
  path: string,
  apiKey: string,
  { json = true, ...init }: RequestInit & { json?: boolean } = {}
): Promise<T> {
  const res = await fetch(`https://api.machines.dev/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(json ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new FlyAPIError(
      `Request failed with status ${res.status} ${res.statusText}: ${text}`
    );
  }
  return (await res.json()) as T;
}
