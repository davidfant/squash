import { parse } from "@babel/parser";
import BabelTraverse from "@babel/traverse";
import type { File } from "@babel/types";
import fg from "fast-glob";
import { promises as fs } from "fs";
import path from "path";

// @ts-expect-error
const traverse: typeof BabelTraverse = BabelTraverse.default;

// –––––––––––––––––––––––––––––––––  interfaces  –––––––––––––––––––––––––––– //
interface SectionVariant {
  id: string;
  name: string;
}
interface Section {
  id: string;
  name: string;
  variants: SectionVariant[];
}
interface Page {
  id: string;
  path: string;
  sectionIds: string[];
}
interface Output {
  sections: Section[];
  pages: Page[];
}

// –––––––––––––––––––––––––––––––––  helpers  –––––––––––––––––––––––––––––––– //
const SRC = (repo: string) => path.join(repo, "src");
const reName = /export\s+const\s+name\s*=\s*["'`]([^"'`]+)["'`]/;
const reIndexOut = /export\s+\{\s*default\s*\}\s+from\s+["'`]([^"'`]+)["'`]/;

const exists = (file: string) =>
  fs
    .access(file)
    .then(() => true)
    .catch(() => false);

async function getName(file: string, fallback: string) {
  const txt = await fs.readFile(file, "utf8");
  return reName.exec(txt)?.[1] ?? fallback;
}

/* replicate the route‑generation logic from src/main.tsx */
function fileToRoute(rel: string) {
  let r = "/" + rel.replace(/^pages\//, "").replace(/\.tsx$/, "");
  r = r.replace(/\/index$/, "");
  r = r.replace(/\[([^\]\.]+)\]/g, ":$1").replace(/\[\.\.\.[^\]]+\]/, "*");
  return r || "/";
}

/* parse a page & return the ordered list of section import IDs */
function orderedSectionIds(source: string): string[] {
  const ast: File = parse(source, {
    sourceType: "module",
    plugins: ["typescript", "jsx"],
  });
  const importMap: Record<string, string> = {};
  const order: string[] = [];

  traverse(ast, {
    ImportDeclaration({ node }) {
      if (node.source.value.startsWith("@/sections/"))
        node.specifiers.forEach(
          (s) => (importMap[s.local.name] = node.source.value)
        );
    },
  });

  traverse(ast, {
    JSXOpeningElement({ node }) {
      if (node.name.type === "JSXIdentifier") {
        const src = importMap[node.name.name];
        if (src && !order.includes(src)) order.push(src);
      }
    },
  });

  return order;
}

// –––––––––––––––––––––––––––––––––  main  ––––––––––––––––––––––––––––––––––– //
async function run(repoRoot = process.cwd()) {
  const srcDir = SRC(repoRoot);

  /* ──────────── 1)  sections & variants ──────────── */
  const sectionDirs = await fg(["*"], {
    cwd: path.join(srcDir, "sections"),
    onlyDirectories: true,
  });
  const sections: Section[] = [];

  for (const dir of sectionDirs) {
    const folder = path.join(srcDir, "sections", dir);
    const idxFile = path.join(folder, "index.ts");
    const variants = await fg(["*.{ts,tsx}", "!index.ts{,x}"], { cwd: folder });

    // which variant does index.ts export?  (→ section display‑name)
    let chosen: string | undefined;
    if (await exists(idxFile)) {
      const idx = await fs.readFile(idxFile, "utf8");
      const relMatch = reIndexOut.exec(idx)?.[1];
      if (relMatch)
        chosen = path.join(
          folder,
          relMatch + (path.extname(relMatch) ? "" : ".tsx")
        );
    }

    /* harvest variants */
    const varMeta: SectionVariant[] = [];
    let sectionName = dir; // fallback
    for (const vf of variants) {
      const full = path.join(folder, vf);
      const vName = await getName(full, path.parse(vf).name);
      if (full === chosen) sectionName = vName;
      varMeta.push({
        id: `@/sections/${dir}/${path.parse(vf).name}`,
        name: vName,
      });
    }

    sections.push({
      id: `@/sections/${dir}`,
      name: sectionName,
      variants: varMeta,
    });
  }

  /* ──────────── 2)  pages ──────────── */
  const pageFiles = await fg(["pages/**/*.tsx"], { cwd: srcDir });
  const pages: Page[] = [];

  for (const rel of pageFiles) {
    const file = path.join(srcDir, rel);
    const source = await fs.readFile(file, "utf8");

    pages.push({
      id: `@/${rel.replace(/\.tsx$/, "")}`,
      path: fileToRoute(rel),
      sectionIds: orderedSectionIds(source),
    });
  }

  /* ──────────── 3)  write metadata.json ──────────── */
  const out: Output = { sections, pages };
  // await fs.writeFile(
  //   path.join(repoRoot, "metadata.json"),
  //   JSON.stringify(out, null, 2)
  // );
  // console.log("✓  metadata.json written");
  console.log(JSON.stringify(out, null, 2));
}

run(process.argv[2]).catch((err) => {
  console.error(err);
  process.exit(1);
});
