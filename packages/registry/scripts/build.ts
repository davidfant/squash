// scripts/build-registry.ts
import fg from "fast-glob";
import MiniSearch from "minisearch";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chunkReadme } from "./chunker";

const root = resolve(process.cwd());
const outData = resolve(root, "src/registry.data.ts");
const outIdxSections = resolve(root, "dist/index.section.json");
const outIdxBlocks = resolve(root, "dist/index.block.json");

type Kind = "section" | "block";
type Entry = {
  path: string;
  kind: Kind;
  id: string;
  readme?: string;
  code?: string;
};

/**
 * Generate a deterministic hash ID from a path
 * Example: "src/sections/hero/hero1" -> "a1b2c3d4e5f6..."
 */
const generateId = (path: string): string =>
  createHash("sha256").update(path).digest("hex").substring(0, 16);

const patterns = [
  "src/sections/**/index.tsx",
  "src/sections/**/README.md",
  "src/blocks/**/index.tsx",
  "src/blocks/**/README.md",
];

const files = await fg(patterns, { cwd: root });
const map = new Map<string, Entry>();

for (const rel of files) {
  const contents = await readFile(resolve(root, rel), "utf8");
  const kind: Kind = rel.startsWith("src/sections/") ? "section" : "block";
  const base = rel.replace(/\/(index\.tsx|README\.md)$/, "");
  const key = `${kind}:${base}`;
  const item = map.get(key) ?? { path: base, kind, id: generateId(base) };
  if (rel.endsWith("index.tsx")) item.code = contents;
  if (rel.endsWith("README.md")) item.readme = contents;
  map.set(key, item);
}

// Emit registry data (lightweight, optional if you only need code-by-path)
const REGISTRY = [...map.values()].filter((e) => !!e.code && !!e.readme);
await writeFile(
  outData,
  `
// AUTO-GENERATED
export interface RegistryEntry {
  id: string;
  path: string;
  kind: "section" | "block";
  readme: string;
  code: string;
}

export const REGISTRY: RegistryEntry[] = ${JSON.stringify(REGISTRY, null, 2)};
`.trim()
);

// Build indexes
function buildIndex(kind: Kind) {
  const mini = new MiniSearch({
    fields: ["title", "heading", "body"],
    storeFields: ["doc", "path", "title", "heading", "body"],
  });
  const chunks = REGISTRY.filter((e) => e.kind === kind && e.readme).flatMap(
    (e) =>
      chunkReadme(e.id, e.readme!).map((c) => ({
        ...c,
        doc: { id: e.id, path: e.path },
      }))
  );
  mini.addAll(chunks);
  return mini;
}

const idxSections = buildIndex("section").toJSON();
const idxBlocks = buildIndex("block").toJSON();

await writeFile(outIdxSections, JSON.stringify(idxSections));
await writeFile(outIdxBlocks, JSON.stringify(idxBlocks));

console.log("Registry and prebuilt indexes written.");
