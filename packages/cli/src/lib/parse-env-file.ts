import { readFileSync } from "node:fs";

export function parseEnvFile(path: string): Record<string, string> {
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
      if (!match) return acc;

      let [, key, val] = match;
      // strip optional quotes and un-escape \n
      if (/^['"]/.test(val!)) val = val!.slice(1, -1).replace(/\\n/g, "\n");

      acc[key!] = val!;
      return acc;
    }, {} as Record<string, string>);
}
