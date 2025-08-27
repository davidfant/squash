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

export function buildParentMap(
  nodes: Record<NodeId, Metadata.ReactFiber.Node>
): Map<NodeId, Set<NodeId>> {
  const parentMap = new Map<NodeId, Set<NodeId>>();

  /**
   * Depth-first walk up the tree, memoising along the way
   * so each node’s ancestor set is computed exactly once.
   */
  const collectAncestors = (id: NodeId): Set<NodeId> => {
    // Already done? – return the cached set.
    const cached = parentMap.get(id);
    if (cached) return cached;

    const out = new Set<NodeId>();
    const node = nodes[id];
    if (!node) throw new Error(`Unknown node ${id}`);

    const { parentId } = node;
    if (parentId !== null) {
      // Add the direct parent…
      out.add(parentId);
      // …then union in the parent’s ancestors (memoised).
      collectAncestors(parentId).forEach(out.add, out);
    }

    parentMap.set(id, out);
    return out;
  };

  // Kick off the collection for every node once.
  Object.keys(nodes).forEach((id) => collectAncestors(id as NodeId));

  return parentMap;
}

function buildPropProvidedMap(
  nodes: Record<NodeId, Metadata.ReactFiber.Node>,
  components: Record<ComponentId, Metadata.ReactFiber.Component.Any>
): Map<ComponentId, Set<ComponentId>> {
  /* ------------------------------------------------------------------ */
  /* 1.  codeId → componentId lookup (fast O(#components))              */
  /* ------------------------------------------------------------------ */
  const codeIdToComponent = new Map<Metadata.ReactFiber.CodeId, ComponentId>();
  for (const [compId, comp] of Object.entries(components)) {
    if ("codeId" in comp && comp.codeId != null) {
      codeIdToComponent.set(comp.codeId, compId as ComponentId);
    }
  }

  /* ------------------------------------------------------------------ */
  /* 2.  Recursive collector that walks arbitrary JS values              */
  /* ------------------------------------------------------------------ */
  const collect = (val: any, out: Set<ComponentId>): void => {
    if (Array.isArray(val)) {
      for (const v of val) collect(v, out);
    } else if (typeof val === "object" && val !== null) {
      if (val.$$typeof === "react.code") {
        const el = val as Metadata.ReactFiber.Element.Code;
        const componentId = codeIdToComponent.get(el.codeId!);
        if (componentId) out.add(componentId);
      }
      // TODO: write a test to verify that this works
      if (val.$$typeof === "react.fragment") {
        const f = val as Metadata.ReactFiber.Element.Fragment;
        for (const c of f.children) collect(c, out);
      }

      // Recurse through all properties so nested structures are covered.
      for (const v of Object.values(val)) collect(v, out);
    }
  };

  /* ------------------------------------------------------------------ */
  /* 3.  Scan every node’s props once                                    */
  /* ------------------------------------------------------------------ */
  const provided = new Map<ComponentId, Set<ComponentId>>();

  for (const node of Object.values(nodes)) {
    const parentComp = node.componentId as ComponentId;
    const set = provided.get(parentComp) ?? new Set<ComponentId>();
    collect(node.props, set);
    if (set.size > 0) provided.set(parentComp, set);
  }

  return provided;
}

// TODO: should remove children that are provided by props among dependencies
function buildComponentDeps(
  nodes: Record<NodeId, Metadata.ReactFiber.Node>,
  components: Record<ComponentId, Metadata.ReactFiber.Component.Any>,
  childMap: Map<NodeId, NodeId[]>,
  propProvided: Map<ComponentId, Set<ComponentId>>
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
      if (
        propProvided.get(parentComp)?.has(childComp) !== false &&
        childComp !== parentComp
      ) {
        direct.get(parentComp)!.add(childComp);
      }
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
  const propProvided = buildPropProvidedMap(nodes, components);
  const componentDeps = buildComponentDeps(
    nodes,
    components,
    childMap,
    propProvided
  );

  // console.log("Metadata", metadata);
  // console.log("Component Nodes Map", componentNodes);
  // console.log("Components provided by props", propProvided);
  // console.log("Component Dependencies", componentDeps);

  const remaining = [...componentNodes];
  const processed = new Set<ComponentId>();

  const next = () => {
    // TODO: when common processing, we want to get the component where the most amount of deps + children have been processed. We e.g. don't want to process a component where lots of children provided through props are not yet processed.
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

  if (remaining.length) {
    for (const [id] of remaining) {
      console.log(
        id,
        // componentDeps.get(id),
        [...componentDeps.get(id)!].filter((id) => !processed.has(id))
      );
    }
    throw new Error(
      `Metadata processor failed to process all components. Remaining: ${remaining.map(([id]) => id).join(", ")}`
    );
  }
}
