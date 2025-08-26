import camelCase from "lodash.camelcase";
import upperFirst from "lodash.upperfirst";
import type { Metadata } from "..";

export function createUniqueNames(
  components: Record<
    Metadata.ReactFiber.ComponentId,
    Metadata.ReactFiber.Component.Any
  >
) {
  const compNameById = new Map<Metadata.ReactFiber.ComponentId, string>(
    Object.entries(components).map(([_id, c]) => {
      const id = _id as Metadata.ReactFiber.ComponentId;
      if ("name" in c && !!c.name && c.name.length >= 3) {
        return [id, upperFirst(camelCase(c.name))];
      }
      return [id, `Component${id.slice(1)}`];
    })
  );
  const compIdsByName = new Map<string, Metadata.ReactFiber.ComponentId[]>();
  for (const id of Object.keys(
    components
  ) as Metadata.ReactFiber.ComponentId[]) {
    const name = compNameById.get(id)!;
    compIdsByName.set(name, [...(compIdsByName.get(name) ?? []), id]);
  }
  // for components with the same name, rename them to CURRENT_NAME${index}
  for (const [name, ids] of compIdsByName) {
    if (ids.length > 1) {
      for (let i = 0; i < ids.length; i++) {
        compNameById.set(ids[i]!, `${name}${i + 1}`);
      }
    }
  }

  return compNameById;
}
