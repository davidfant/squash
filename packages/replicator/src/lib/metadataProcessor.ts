import { Metadata } from "..";

type NodeId = Metadata.ReactFiber.NodeId;
type ComponentId = Metadata.ReactFiber.ComponentId;

const componentHasCode = (
  c: Metadata.ReactFiber.Component.Any
): c is Metadata.ReactFiber.Component.WithCode<any> =>
  "codeId" in c && c.codeId != null;

export function buildChildMap(
  nodes: Record<NodeId, Metadata.ReactFiber.Node>
): Map<NodeId, NodeId[]> {
  const m = new Map<NodeId, NodeId[]>();
  for (const [_nodeId, n] of Object.entries(nodes)) {
    const nodeId = _nodeId as NodeId;
    if (n.parentId) {
      m.set(n.parentId, [...(m.get(n.parentId) ?? []), nodeId]);
    }
  }
  return m;
}

export function buildAncestorsMap(
  nodes: Record<NodeId, Metadata.ReactFiber.Node>
): Map<NodeId, Set<NodeId>> {
  const memo = new Map<NodeId, Set<NodeId>>();
  const collect = (id: NodeId): Set<NodeId> => {
    if (memo.has(id)) return memo.get(id)!;

    const out = new Set<NodeId>();
    const node = nodes[id];
    if (!node) throw new Error(`Unknown node ${id}`);

    const { parentId } = node;
    if (parentId !== null) {
      out.add(parentId);
      collect(parentId).forEach(out.add, out);
    }
    memo.set(id, out);
    return out;
  };

  // Kick off the collection for every node once.
  Object.keys(nodes).forEach((id) => collect(id as NodeId));

  return memo;
}

function buildDescendantsMap(
  nodes: Record<NodeId, Metadata.ReactFiber.Node>,
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

  Object.keys(nodes).forEach((id) => collect(id as NodeId));
  return memo;
}

function buildComponentsProvidedViaPropsMap(
  nodes: Record<NodeId, Metadata.ReactFiber.Node>,
  components: Record<ComponentId, Metadata.ReactFiber.Component.Any>
): Map<ComponentId, Set<ComponentId>> {
  /* ------------------------------------------------------------------ */
  /* 1.  codeId → componentId lookup (fast O(#components))              */
  /* ------------------------------------------------------------------ */
  const codeIdToComponent = new Map<Metadata.ReactFiber.CodeId, ComponentId>();
  for (const [compId, comp] of Object.entries(components)) {
    if (componentHasCode(comp)) {
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
  descendants: Map<NodeId, Set<NodeId>>,
  componentsProvidedViaPropsMap: Map<ComponentId, Set<ComponentId>>
): Map<ComponentId, Set<ComponentId>> {
  const deps = new Map<ComponentId, Set<ComponentId>>();
  for (const n of Object.values(nodes)) deps.set(n.componentId, new Set());

  for (const [nodeId, node] of Object.entries(nodes)) {
    const parentComp = node.componentId;
    const targetSet = deps.get(parentComp)!;

    for (const descId of descendants.get(nodeId as NodeId) ?? []) {
      const childComp = nodes[descId]!.componentId;
      if (childComp !== parentComp) targetSet.add(childComp);
    }
  }

  for (const [cid, viaProps] of componentsProvidedViaPropsMap) {
    viaProps.forEach((c) => deps.get(c)!.delete(cid));
  }

  for (const d of deps.values()) {
    for (const c of d) if (!componentHasCode(components[c]!)) d.delete(c);
  }

  return deps;
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
  const descendants = buildDescendantsMap(nodes, buildChildMap(nodes));
  const componentNodes = buildComponentNodesMap(nodes);
  const componentsProvidedViaPropsMap = buildComponentsProvidedViaPropsMap(
    nodes,
    components
  );
  const componentDepsInclProps = buildComponentDeps(
    nodes,
    components,
    descendants,
    new Map()
  );
  const componentDepsExclProps = buildComponentDeps(
    nodes,
    components,
    descendants,
    componentsProvidedViaPropsMap
  );

  // console.log("Metadata", metadata);
  // console.log("Component Nodes Map", componentNodes);
  // console.log("Components provided by props", propProvided);
  // console.log("Component Dependencies", componentDeps);

  // console.log("C64 nodes", componentNodes.get("C64"));
  // const dWithoutP = buildComponentDeps(nodes, components, childMap, new Map());
  // console.log(
  //   "C64 children",
  //   // buildComponentDeps(nodes, components, childMap, new Map()).get("C64"),
  //   dWithoutP.get("C40")
  // );
  // console.log("C64 props", propProvided.get("C64"));
  // console.log("C64 deps", componentDeps.get("C64"));
  // // console.log("parent", buildParentMap(nodes));
  // console.log("---");

  // sort remaining by having those with the fewest deps first
  const remaining = [...componentNodes]
    .map(([componentId, nodes]) => ({ componentId, nodes }))
    .sort(
      (a, b) =>
        (componentDepsInclProps.get(a.componentId)?.size ?? 0) -
        (componentDepsInclProps.get(b.componentId)?.size ?? 0)
    );
  const processed = new Set<ComponentId>();

  const next = () => {
    // TODO: when common processing, we want to get the component where the most amount of deps + children have been processed. We e.g. don't want to process a component where lots of children provided through props are not yet processed.
    const idx = remaining.findIndex(({ componentId }) =>
      [...componentDepsExclProps.get(componentId)!].every((cid) =>
        processed.has(cid)
      )
    );

    if (idx === -1) return;
    const [spliced] = remaining.splice(idx, 1);
    return spliced!;
  };

  let g: { componentId: ComponentId; nodes: NodeId[] } | undefined;
  while ((g = next())) {
    console.log(
      "✅✅✅✅✅✅✅✅✅ process...",
      g.componentId,
      componentDepsExclProps.get(g.componentId)?.size
    );
    await process({
      id: g.componentId,
      component: metadata.components[g.componentId]!,
      nodes: Object.fromEntries(g.nodes.map((id) => [id, nodes[id]!])),
    });
    processed.add(g.componentId);
  }

  if (remaining.length) {
    for (const { componentId } of remaining) {
      console.log(
        componentId,
        // componentDeps.get(id),
        [...componentDepsExclProps.get(componentId)!].filter(
          (id) => !processed.has(id)
        )
      );
    }
    // throw new Error(
    //   `Metadata processor failed to process all components. Remaining: ${remaining.map(({ componentId }) => componentId).join(", ")}`
    // );
  }
}
