import path from "node:path";
import { REPO_ROOT } from "./consts";

export async function uploadFiles(
  files: Array<{ content: string; path: string }>,
  options: { sandboxId: string; apiKey: string }
): Promise<void> {
  const formData = new FormData();
  files.forEach((file, index) => {
    formData.append(`files[${index}].path`, path.join(REPO_ROOT, file.path));
    formData.append(
      `files[${index}].file`,
      new Blob([file.content]),
      file.path
    );
  });

  const headers: Record<string, string> = {
    Authorization: `Bearer ${options.apiKey}`,
  };

  const response = await fetch(
    `https://app.daytona.io/api/toolbox/${encodeURIComponent(
      options.sandboxId
    )}/toolbox/files/bulk-upload`,
    { method: "POST", headers, body: formData }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Upload failed: ${response.status} ${response.statusText} - ${errorText}`
    );
  }
}
