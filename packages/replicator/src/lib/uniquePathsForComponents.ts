import camelCase from "lodash.camelcase";
import kebabCase from "lodash.kebabcase";
import upperFirst from "lodash.upperfirst";
import type { Metadata } from "..";

type ComponentId = Metadata.ReactFiber.ComponentId;
type Component = Metadata.ReactFiber.Component.Any;

interface PathInfo {
  dir: string;
  name: string;
}

/** Split “A.B.C” into { path: "A/B", name: "C" } */
function toPathParts(raw: string): { dir: string; leaf: string } {
  const pieces = raw.split(".");
  const leaf = pieces.pop()!;
  const dir = pieces.map(kebabCase).join("/");
  return { dir, leaf };
}

const getName = (id: ComponentId, c: Component) =>
  "name" in c && c.name && c.name.length >= 3
    ? c.name
    : `Component${id.slice(1)}`;

/** PascalCase without touching non-word characters (good for React) */
const pascal = (s: string) => upperFirst(camelCase(s));

export function uniquePathsForComponents(
  components: Record<ComponentId, Component>
): Map<ComponentId, PathInfo> {
  /* ---------- 1. bucket components by directory ---------- */
  const byDir = new Map<string, Array<{ id: ComponentId; leaf: string }>>();

  for (const [id, comp] of Object.entries(components) as [
    ComponentId,
    Component,
  ][]) {
    const rawName = getName(id, comp);
    const { dir, leaf } = toPathParts(rawName);
    const bucket = byDir.get(dir) ?? [];
    bucket.push({ id, leaf });
    byDir.set(dir, bucket);
  }

  /* ---------- 2. resolve unique names inside each directory ---------- */
  const result = new Map<ComponentId, PathInfo>();

  for (const [dir, items] of byDir) {
    // group by the normalised base name first
    const groups = new Map<string, Array<{ id: ComponentId; idx: number }>>();

    items.forEach(({ id, leaf }) => {
      const base = pascal(leaf);
      const list = groups.get(base) ?? [];
      list.push({ id, idx: list.length + 1 }); // pre-assign 1-based index
      groups.set(base, list);
    });

    // assign final names
    for (const [base, list] of groups) {
      for (const { id, idx } of list) {
        if (list.length === 1) {
          result.set(id, { dir, name: base });
        } else {
          result.set(id, { dir, name: `${base}${idx}` });
        }
      }
    }
  }

  return result;
}
