import type { FileSink } from "../sinks/base";

export function replaceSVGPathAliases<T>(
  value: T,
  dPathMapping: Map<string, string>
): T {
  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    let result = value as string;
    for (const [key, replacement] of dPathMapping.entries()) {
      result = result.replaceAll(key, replacement);
    }
    return result as T;
  }

  if (typeof value !== "object") return value;

  if (Array.isArray(value)) {
    return value.map((item) => replaceSVGPathAliases(item, dPathMapping)) as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    result[key] = replaceSVGPathAliases(val, dPathMapping);
  }
  return result as T;
}

export async function replaceSVGPathsInFiles(
  sink: FileSink,
  dPathMapping: Map<string, string>
): Promise<void> {
  const files = await sink.list();
  await Promise.all(
    files.map(async (filePath) => {
      const original = await sink.readText(filePath);
      console.log(
        "replace SVG paths in files...",
        filePath,
        original,
        dPathMapping
      );
      let updated = original;
      for (const [key, placeholder] of dPathMapping.entries()) {
        updated = updated.replaceAll(placeholder, key);
      }
      if (updated !== original) {
        await sink.writeText(filePath, updated);
      }
    })
  );
}
