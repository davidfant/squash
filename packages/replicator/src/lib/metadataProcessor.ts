import { Metadata } from "..";

type NodeId = Metadata.ReactFiber.NodeId;
type ComponentId = Metadata.ReactFiber.ComponentId;

function buildChildMap(
  nodes: Record<NodeId, Metadata.ReactFiber.Node>
): Map<NodeId, NodeId[]> {
  const m = new Map<NodeId, NodeId[]>();
  for (const [_nodeId, n] of Object.entries(nodes)) {
    const nodeId = _nodeId as NodeId;
    if (!m.has(nodeId)) m.set(nodeId, []);
    if (n.parentId !== null) (m.get(n.parentId) ?? []).push(nodeId);
  }
  return m;
}

function buildComponentDeps(
  nodes: Record<NodeId, Metadata.ReactFiber.Node>,
  components: Record<ComponentId, Metadata.ReactFiber.Component.Any>,
  childMap: Map<NodeId, NodeId[]>
): Map<ComponentId, Set<ComponentId>> {
  const componentIds = new Set<ComponentId>(
    Object.values(nodes).map((n) => n.componentId)
  );

  // 1. build direct component ➜ component edges
  const direct = new Map<ComponentId, Set<ComponentId>>();
  for (const compId of componentIds) direct.set(compId, new Set());

  for (const [nodeId, node] of Object.entries(nodes)) {
    const parentComp = node.componentId;
    const childIds = childMap.get(nodeId as NodeId) ?? [];

    for (const cId of childIds) {
      const childComp = nodes[cId]!.componentId;
      if (childComp !== parentComp) direct.get(parentComp)!.add(childComp);
    }
  }

  // 2. expand to transitive closure with simple DFS + memo
  const memo = new Map<ComponentId, Set<ComponentId>>();
  const collect = (
    cid: ComponentId,
    stack = new Set<ComponentId>()
  ): Set<ComponentId> => {
    if (memo.has(cid)) return memo.get(cid)!;
    if (stack.has(cid)) return new Set(); // defensive: cycle detected
    stack.add(cid);

    const out = new Set<ComponentId>();
    for (const d of direct.get(cid) ?? []) {
      out.add(d);
      for (const sub of collect(d, stack)) out.add(sub);
    }
    stack.delete(cid);
    memo.set(cid, out);
    return out;
  };

  const result = new Map<ComponentId, Set<ComponentId>>();
  for (const compId of componentIds) result.set(compId, collect(compId));
  // remove all non-code React components (e.g. DOM nodes, text nodes, etc)
  for (const [compId, comp] of Object.entries(components)) {
    if (!("codeId" in comp)) {
      for (const deps of result.values()) {
        deps.delete(compId as ComponentId);
      }
    }
  }
  return result;
}

function buildComponentNodesMap(
  nodes: Record<NodeId, Metadata.ReactFiber.Node>
): Map<ComponentId, NodeId[]> {
  const groups = new Map<ComponentId, NodeId[]>();

  for (const [nodeId, node] of Object.entries(nodes)) {
    if (!groups.has(node.componentId)) groups.set(node.componentId, []);
    groups.get(node.componentId)!.push(nodeId as NodeId);
  }

  return groups;
}

export async function metadataProcessor(
  metadata: Metadata.ReactFiber,
  process: (group: {
    id: ComponentId;
    component: Metadata.ReactFiber.Component.Any;
    nodes: Record<NodeId, Metadata.ReactFiber.Node>;
  }) => unknown
) {
  if (!metadata) return;

  const { nodes, components } = metadata;
  const childMap = buildChildMap(nodes);
  const componentNodes = buildComponentNodesMap(nodes);
  const componentDeps = buildComponentDeps(nodes, components, childMap);

  console.log("Metadata", metadata);
  console.log("Component Nodes Map", componentNodes);
  console.log("Component Dependencies", componentDeps);

  const remaining = [...componentNodes];
  const processed = new Set<ComponentId>();

  const next = () => {
    const idx = remaining.findIndex(([componentId]) =>
      [...componentDeps.get(componentId)!].every((cid) => processed.has(cid))
    );
    if (idx === -1) return;
    const [spliced] = remaining.splice(idx, 1);
    const [componentId, nodes] = spliced!;
    return { componentId, nodes };
  };

  let g: { componentId: ComponentId; nodes: NodeId[] } | undefined;
  while ((g = next())) {
    await process({
      id: g.componentId,
      component: metadata.components[g.componentId]!,
      nodes: Object.fromEntries(g.nodes.map((id) => [id, nodes[id]!])),
    });
    processed.add(g.componentId);
  }
}
