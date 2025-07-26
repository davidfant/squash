export async function uploadFiles(
  sandboxId: string,
  files: Array<{ content: string; path: string }>,
  options: { apiKey: string }
): Promise<void> {
  const formData = new FormData();
  files.forEach((file, index) => {
    formData.append(`files[${index}].path`, file.path);
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
      sandboxId
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
