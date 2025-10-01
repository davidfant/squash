import { env } from "cloudflare:workers";

export async function downloadFileFromSandbox(
  sandboxId: string,
  filePath: string
) {
  const url = `https://app.daytona.io/api/toolbox/${sandboxId}/toolbox/files/download?path=${encodeURIComponent(
    filePath
  )}`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${env.DAYTONA_API_KEY}` },
  });

  if (!resp.ok) {
    throw new Error(
      `Daytona responded ${resp.status} (${resp.statusText}) while downloading files.`
    );
  }

  return Buffer.from(await resp.arrayBuffer());
}
