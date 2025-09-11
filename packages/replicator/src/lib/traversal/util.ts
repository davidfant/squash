import { Metadata } from "../..";

type NodeId = Metadata.ReactFiber.NodeId;
type ComponentId = Metadata.ReactFiber.ComponentId;

export function buildChildMap(
  nodes: Map<NodeId, Metadata.ReactFiber.Node>
): Map<NodeId, NodeId[]> {
  const m = new Map<NodeId, NodeId[]>();
  for (const [nodeId, n] of nodes.entries()) {
    if (n.parentId) {
      m.set(n.parentId, [...(m.get(n.parentId) ?? []), nodeId]);
    }
  }
  return m;
}

export function buildAncestorsMap(
  nodes: Map<NodeId, Metadata.ReactFiber.Node>
): Map<NodeId, Set<NodeId>> {
  const memo = new Map<NodeId, Set<NodeId>>();
  const collect = (id: NodeId): Set<NodeId> => {
    if (memo.has(id)) return memo.get(id)!;

    const out = new Set<NodeId>();
    const node = nodes.get(id);
    if (!node) throw new Error(`Unknown node ${id}`);

    const { parentId } = node;
    if (parentId !== null) {
      out.add(parentId);
      collect(parentId).forEach(out.add, out);
    }
    memo.set(id, out);
    return out;
  };

  nodes.forEach((_, id) => collect(id));
  return memo;
}

export function buildDescendantsMap(
  childMap: Map<NodeId, NodeId[]>
): Map<NodeId, Set<NodeId>> {
  const memo = new Map<NodeId, Set<NodeId>>();
  const collect = (id: NodeId): Set<NodeId> => {
    if (memo.has(id)) return memo.get(id)!;
    const out = new Set<NodeId>();
    for (const childId of childMap.get(id) ?? []) {
      out.add(childId);
      collect(childId).forEach(out.add, out);
    }
    memo.set(id, out);
    return out;
  };

  childMap.forEach((_, id) => collect(id));
  return memo;
}

export function buildComponentNodesMap(
  nodes: Map<NodeId, Metadata.ReactFiber.Node>
): Map<ComponentId, NodeId[]> {
  const groups = new Map<ComponentId, NodeId[]>();

  for (const [nodeId, node] of nodes.entries()) {
    if (!groups.has(node.componentId)) groups.set(node.componentId, []);
    groups.get(node.componentId)!.push(nodeId as NodeId);
  }

  return groups;
}

export function calcNodeDepths(
  nodes: Map<NodeId, Metadata.ReactFiber.Node>
): Map<NodeId, number> {
  const memo = new Map<NodeId, number>();
  const getDepth = (id: NodeId, seen: Set<NodeId> = new Set()): number => {
    if (seen.has(id)) throw new Error(`Cycle detected at node ${id}`);
    if (memo.has(id)) return memo.get(id)!;

    const node = nodes.get(id);
    if (!node) throw new Error(`Orphan node ${id}`);

    if (node.parentId === null) {
      memo.set(id, 0);
      return 0;
    }

    seen.add(id);
    const d = getDepth(node.parentId, seen) + 1;
    seen.delete(id);

    memo.set(id, d);
    return d;
  };

  // populate memo for every node
  nodes.forEach((_, id) => getDepth(id));
  return memo;
}

export const nodesMap = (nodes: Record<NodeId, Metadata.ReactFiber.Node>) =>
  new Map(Object.entries(nodes).map(([id, n]) => [id as NodeId, n]));

export const componentsMap = (
  components: Record<ComponentId, Metadata.ReactFiber.Component.Any>
) =>
  new Map(Object.entries(components).map(([id, c]) => [id as ComponentId, c]));
