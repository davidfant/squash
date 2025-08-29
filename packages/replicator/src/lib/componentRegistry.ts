import camelCase from "lodash.camelcase";
import kebabCase from "lodash.kebabcase";
import upperFirst from "lodash.upperfirst";
import path from "node:path";
import type { Metadata } from "..";

type ComponentId = Metadata.ReactFiber.ComponentId;
type Component = Metadata.ReactFiber.Component.Any;

export interface ComponentRegistryItem {
  id: ComponentId;
  path: string;
  module: string;
  name: { value: string; isFallback: boolean };
  code: string;
}

export type ComponentRegistry = Map<ComponentId, ComponentRegistryItem>;

/** Split “A.B.C” into { path: "A/B", name: "C" } */
function toPathParts(raw: string): { dir: string; leaf: string } {
  const pieces = raw.split(".");
  const leaf = pieces.pop()!;
  const dir = pieces.map(kebabCase).join("/");
  return { dir, leaf };
}

const getName = (id: ComponentId, c: Component) =>
  "name" in c && c.name && c.name.length >= 3
    ? { value: c.name, isFallback: false }
    : { value: `Component${id.slice(1)}`, isFallback: true };

/** PascalCase without touching non-word characters (good for React) */
const pascal = (s: string) => upperFirst(camelCase(s));

export function buildInitialComponentRegistry(
  components: Record<ComponentId, Component>
): Map<ComponentId, ComponentRegistryItem> {
  /* ---------- 1. bucket components by directory ---------- */
  const byDir = new Map<string, Array<{ id: ComponentId; leaf: string }>>();
  const isFallback = new Map<ComponentId, boolean>();

  for (const [id, comp] of Object.entries(components) as [
    ComponentId,
    Component,
  ][]) {
    const name = getName(id, comp);
    const { dir, leaf } = toPathParts(name.value);
    const bucket = byDir.get(dir) ?? [];
    bucket.push({ id, leaf });
    isFallback.set(id, name.isFallback);
    byDir.set(dir, bucket);
  }

  /* ---------- 2. resolve unique names inside each directory ---------- */
  const result = new Map<ComponentId, ComponentRegistryItem>();

  for (const [dir, items] of byDir) {
    // group by the normalised base name first
    const groups = new Map<string, Array<{ id: ComponentId; idx: number }>>();

    items.forEach(({ id, leaf }) => {
      const base = pascal(leaf);
      const list = groups.get(base) ?? [];
      list.push({ id, idx: list.length + 1 });
      groups.set(base, list);
    });

    for (const [base, list] of groups) {
      for (const { id, idx } of list) {
        const name =
          list.length === 1
            ? { value: base, isFallback: isFallback.get(id) ?? true }
            : { value: `${base}${idx}`, isFallback: true };

        const m = path.join("@/components", dir, name.value);
        const p = path.join("src/components", dir, `${name.value}.tsx`);
        result.set(id, {
          id,
          path: p,
          module: m,
          name,
          code: `export const ${name.value} = () => null;`,
        });
      }
    }
  }

  return result;
}
