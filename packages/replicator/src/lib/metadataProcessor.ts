import type { Metadata } from "..";

type NodeId = number;
type ComponentId = number;

interface GroupInfo {
  nodes: NodeId[];
  dependencies: Set<ComponentId>;
  dependants: Set<ComponentId>;
}

function buildChildMap(
  nodes: Record<NodeId, Metadata.ReactFiber.Node>
): Map<NodeId, NodeId[]> {
  const m = new Map<NodeId, NodeId[]>();
  for (const [idStr, n] of Object.entries(nodes)) {
    const id = Number(idStr);
    if (!m.has(id)) m.set(id, []);
    if (n.parentId !== null) (m.get(n.parentId) ?? []).push(id);
  }
  return m;
}

function buildGroups(
  nodes: Record<NodeId, Metadata.ReactFiber.Node>,
  components: Record<ComponentId, Metadata.ReactFiber.Component.Any>
): Map<ComponentId, GroupInfo> {
  const childMap = buildChildMap(nodes);
  const groups = new Map<ComponentId, GroupInfo>();

  // helper to lazily create group objects
  const getGroup = (cid: ComponentId) =>
    groups.get(cid) ??
    groups
      .set(cid, { nodes: [], dependencies: new Set(), dependants: new Set() })
      .get(cid)!;

  for (const [idStr, node] of Object.entries(nodes)) {
    const id = Number(idStr);
    if (!groups.has(node.componentId)) {
      getGroup(node.componentId).nodes.push(id);
    }
  }

  // 2️⃣ establish cross-group dependencies
  for (const [id, node] of Object.entries(nodes)) {
    const parent = nodes[Number(id)]!;
    const parentCid = parent.componentId;

    for (const childId of childMap.get(Number(id)) ?? []) {
      const childCid = nodes[childId]!.componentId;
      if (childCid !== parentCid) {
        getGroup(parentCid).dependencies.add(childCid);
        getGroup(childCid).dependants.add(parentCid);
      }
    }
  }

  return groups;
}

export async function metadataProcessor(
  metadata: Metadata.ReactFiber,
  process: (group: {
    id: number;
    component: Metadata.ReactFiber.Component.Any;
    nodes: Record<NodeId, Metadata.ReactFiber.Node>;
  }) => unknown
) {
  if (!metadata) return;

  const { nodes, components } = metadata;
  const groups = buildGroups(nodes, components);

  // dependency counters
  const remaining = new Map<ComponentId, number>(
    [...groups].map(([cid, g]) => [cid, g.dependencies.size])
  );

  // queue of groups that are ready right now
  const ready: ComponentId[] = [...remaining]
    .filter(([, cnt]) => cnt === 0)
    .map(([cid]) => cid);

  const processed = new Set<ComponentId>();

  while (ready.length) {
    const cid = ready.pop()!;
    const g = groups.get(cid)!;

    await process({
      id: cid,
      component: metadata.components[cid]!,
      nodes: Object.fromEntries(g.nodes.map((id) => [id, nodes[id]!])),
    });
    processed.add(cid);

    for (const higher of g.dependants) {
      const left = remaining.get(higher)! - 1;
      remaining.set(higher, left);
      if (left === 0) ready.push(higher);
    }
  }

  const unprocessed = [...groups.keys()].filter((cid) => !processed.has(cid));
  if (unprocessed.length) {
    throw new Error(
      `Dependency cycle detected among components: ${unprocessed.join(", ")}`
    );
  }
}
