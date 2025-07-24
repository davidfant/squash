import { parse } from "@babel/parser";
import BabelTraverse from "@babel/traverse";
import type { File } from "@babel/types";
import fg from "fast-glob";
import { promises as fs } from "fs";
import path from "path";

// @ts-expect-error
const traverse: typeof BabelTraverse = BabelTraverse.default;

// –––––––––––––––––––––––––––––––––  interfaces  –––––––––––––––––––––––––––– //
export interface ProjectSectionVariant {
  id: string;
  name: string;
  selected: boolean;
}
export interface ProjectSection {
  id: string;
  name: string;
  variants: ProjectSectionVariant[];
}
export interface ProjectPage {
  id: string;
  name: string;
  path: string;
  sectionIds: string[];
}
export interface ProjectMetadata {
  sections: ProjectSection[];
  pages: ProjectPage[];
}

// –––––––––––––––––––––––––––––––––  helpers  –––––––––––––––––––––––––––––––– //
const SRC = (repo: string) => path.join(repo, "src");
const reName = /export\s+const\s+name\s*=\s*(["'`][^"'`]+["'`])/;
const reIndexOut = /export\s+\{\s*default\s*\}\s+from\s+["'`]([^"'`]+)["'`]/;

const toBase64 = (str: string) => Buffer.from(str).toString("base64");

const exists = (file: string) =>
  fs
    .access(file)
    .then(() => true)
    .catch(() => false);

async function getName(file: string, fallback: string) {
  const txt = await fs.readFile(file, "utf8");
  const name = reName.exec(txt)?.[1];
  return !!name ? JSON.parse(name) : fallback;
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
  const sections: ProjectSection[] = [];

  for (const dir of sectionDirs) {
    const folder = path.join(srcDir, "sections", dir);
    const idxFile = path.join(folder, "index.ts");
    const variants = await fg(["*.{ts,tsx}", "!index.ts{,x}"], { cwd: folder });

    // which variant does index.ts export?  (→ section display‑name)
    let chosen: string | undefined;
    const idx = await fs.readFile(idxFile, "utf8");
    const relMatch = reIndexOut.exec(idx)?.[1];
    if (relMatch) {
      chosen = path.join(
        folder,
        relMatch + (path.extname(relMatch) ? "" : ".tsx")
      );
    }
    const sName = await getName(idxFile, dir);

    /* harvest variants */
    const varMeta: ProjectSectionVariant[] = [];
    for (const vf of variants) {
      const full = path.join(folder, vf);
      const vName = await getName(full, path.parse(vf).name);
      varMeta.push({
        id: toBase64(`@/sections/${dir}/${path.parse(vf).name}`),
        name: vName,
        selected: full === chosen,
      });
    }

    sections.push({
      id: toBase64(`@/sections/${dir}`),
      name: sName,
      variants: varMeta,
    });
  }

  /* ──────────── 2)  pages ──────────── */
  const pageFiles = await fg(["pages/**/*.tsx"], { cwd: srcDir });
  const pages: ProjectPage[] = [];

  for (const rel of pageFiles) {
    const file = path.join(srcDir, rel);
    const source = await fs.readFile(file, "utf8");

    pages.push({
      id: toBase64(`@/${rel.replace(/\.tsx$/, "")}`),
      name: await getName(file, path.parse(rel).name),
      path: fileToRoute(rel),
      sectionIds: orderedSectionIds(source).map(toBase64),
    });
  }

  /* ──────────── 3)  write metadata.json ──────────── */
  const out: ProjectMetadata = { sections, pages };
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
