export class FlyAPIError extends Error {}

export async function flyFetch<T>(
  path: string,
  apiKey: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`https://api.machines.dev/v1${path}`, {
    ...init,
    headers: Object.assign(
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      init.headers
    ),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new FlyAPIError(
      `Request failed with status ${res.status} ${res.statusText}: ${text}`
    );
  }
  return (await res.json()) as T;
}
