import type { Metadata } from "..";

type NodeId = number;
type ComponentId = number;

interface GroupInfo {
  nodes: NodeId[];
  dependants: Set<ComponentId>;
  dependencies: Set<ComponentId>;
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

  const getGroup = (cid: ComponentId) =>
    groups.get(cid) ??
    groups
      .set(cid, { nodes: [], dependants: new Set(), dependencies: new Set() })
      .get(cid)!;

  for (const [idStr, node] of Object.entries(nodes)) {
    const id = Number(idStr);
    getGroup(node.componentId).nodes.push(id);
  }

  for (const [nodeId, node] of Object.entries(nodes)) {
    const parent = nodes[Number(nodeId)]!;
    const parentCid = parent.componentId;
    console.log("outer", nodeId, parent);

    console.log("children", childMap.get(Number(nodeId)));
    for (const childId of childMap.get(Number(nodeId)) ?? []) {
      const childCid = nodes[childId]!.componentId;
      if (childCid !== parentCid) {
        console.log("adding...", { childCid, parentCid });
        getGroup(parentCid).dependencies.add(childCid);
        getGroup(childCid).dependants.add(parentCid);
      }
    }
  }

  console.log("childMap", childMap);

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

  console.log("Metadata", metadata);
  console.log("Groups", groups);

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

  // const unprocessed = [...groups.keys()].filter((cid) => !processed.has(cid));
  // if (unprocessed.length) {
  //   throw new Error(
  //     `Dependency cycle detected among components: ${unprocessed.join(", ")}`
  //   );
  // }
}
