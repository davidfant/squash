import { env } from "cloudflare:workers";
import path from "node:path";
import mime from "mime/lite";

async function downloadFile(sandboxId: string, filePath: string) {
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

  return resp;
}

export async function downloadFileFromSandbox(
  sandboxId: string,
  filePath: string
) {
  const resp = await downloadFile(sandboxId, filePath);
  return Buffer.from(await resp.arrayBuffer());
}

export async function uploadSandboxFileToDeployment(
  sandboxId: string,
  filePath: { absolute: string; relative: string },
  deploymentPath: string
) {
  const resp = await downloadFile(sandboxId, filePath.absolute);
  const contentType =
    mime.getType(filePath.absolute) ?? "application/octet-stream";
  await env.DEPLOYMENTS.put(
    path.join(deploymentPath, filePath.relative),
    resp.body!,
    {
      httpMetadata: { contentType },
      customMetadata: { source: "daytona", sandboxId, path: filePath.absolute },
    }
  );
}
