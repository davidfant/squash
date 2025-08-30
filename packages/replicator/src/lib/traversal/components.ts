import { Metadata } from "../..";
import { getInternalDeps } from "./getInternalDeps";
import {
  buildChildMap,
  buildComponentNodesMap,
  buildDescendantsMap,
  calcNodeDepths,
  componentsMap,
  nodesMap,
} from "./util";

type NodeId = Metadata.ReactFiber.NodeId;
type ComponentId = Metadata.ReactFiber.ComponentId;

const componentHasCode = (
  c: Metadata.ReactFiber.Component.Any
): c is Metadata.ReactFiber.Component.WithCode<any> =>
  "codeId" in c && c.codeId != null;

export function collectDescendantComponents(
  rootNodeIds: Iterable<Metadata.ReactFiber.NodeId>,
  descendantMap: Map<
    Metadata.ReactFiber.NodeId,
    Set<Metadata.ReactFiber.NodeId>
  >,
  nodes: Record<Metadata.ReactFiber.NodeId, Metadata.ReactFiber.Node>,
  components: Record<
    Metadata.ReactFiber.ComponentId,
    Metadata.ReactFiber.Component.Any
  >
): Set<Metadata.ReactFiber.ComponentId> {
  const out = new Set<Metadata.ReactFiber.ComponentId>();

  /** Visit every node (root + all its descendants) exactly once */
  for (const rootId of rootNodeIds) {
    const visitStack: Metadata.ReactFiber.NodeId[] = [rootId];

    while (visitStack.length) {
      const nid = visitStack.pop()!;
      const node = nodes[nid]!;
      const comp = components[node.componentId]!;

      // if (componentHasCode(comp)) {
      out.add(node.componentId);
      // }

      // DFS: push all descendants
      const desc = descendantMap.get(nid);
      if (desc) {
        for (const child of desc) visitStack.push(child);
      }
    }
  }

  return out;
}

// TODO: when stuck, get the most deeply nested component
export async function traverseComponents(
  metadata: Metadata.ReactFiber,
  process: (group: {
    id: ComponentId;
    component: Metadata.ReactFiber.Component.Any;
    nodes: Record<NodeId, Metadata.ReactFiber.Node>;
    deps: { internal: Set<ComponentId>; all: Set<ComponentId> };
  }) => unknown
) {
  if (!metadata) return;

  const nodes = nodesMap(metadata.nodes);
  const components = componentsMap(metadata.components);
  const componentNodes = buildComponentNodesMap(nodes);

  const nodeDepths = calcNodeDepths(nodes);
  const componentMaxDepths = new Map<ComponentId, number>();
  for (const [nodeId, depth] of nodeDepths.entries()) {
    const componentId = nodes.get(nodeId)!.componentId;
    componentMaxDepths.set(
      componentId,
      Math.max(componentMaxDepths.get(componentId) ?? 0, depth)
    );
  }

  const nodeInternalDeps = getInternalDeps(metadata);
  const componentInternalDeps = new Map<ComponentId, Set<ComponentId>>();
  for (const [componentId, nodes] of componentNodes) {
    if (componentInternalDeps.has(componentId)) {
      componentInternalDeps.set(componentId, new Set());
    }
    nodes.forEach((nodeId) =>
      nodeInternalDeps
        .get(nodeId)
        ?.forEach((cid) => componentInternalDeps.get(componentId)?.add(cid))
    );
  }

  const children = buildChildMap(nodes);
  const descendants = buildDescendantsMap(children);
  const componentAllDeps = new Map<ComponentId, Set<ComponentId>>();
  descendants.forEach((descNodeIds, nodeId) => {
    const componentId = nodes.get(nodeId)!.componentId;
    if (componentAllDeps.has(componentId)) {
      componentAllDeps.set(componentId, new Set());
    }
    descNodeIds.forEach((descNodeId) => {
      const descCompId = nodes.get(descNodeId)!.componentId;
      componentAllDeps.get(descCompId)?.add(descCompId);
    });
  });

  const remaining = [...componentNodes]
    .map(([componentId, nodes]) => ({ componentId, nodes }))
    .sort(
      (a, b) =>
        (componentMaxDepths.get(b.componentId) ?? 0) -
        (componentMaxDepths.get(a.componentId) ?? 0)
    );
  const processed = new Set<ComponentId>();

  const next = () => {
    // TODO: when common processing, we want to get the component where the most amount of deps + children have been processed. We e.g. don't want to process a component where lots of children provided through props are not yet processed.
    const idx = remaining.findIndex(({ componentId }) =>
      [...(componentInternalDeps.get(componentId) ?? [])].every((cid) =>
        processed.has(cid)
      )
    );

    if (idx === -1) return;
    const [spliced] = remaining.splice(idx, 1);
    return spliced!;
  };

  let g: { componentId: ComponentId; nodes: NodeId[] } | undefined;
  while ((g = next())) {
    await process({
      id: g.componentId,
      component: metadata.components[g.componentId]!,
      nodes: Object.fromEntries(g.nodes.map((id) => [id, nodes.get(id)!])),
      deps: {
        // TODO: should this maybe only include components up until
        // a component uses another component? in that case it's no
        // longer a direct internal dependency
        internal: componentInternalDeps.get(g.componentId)!,
        all: componentAllDeps.get(g.componentId)!,
      },
    });
    processed.add(g.componentId);
  }

  if (remaining.length) {
    for (const { componentId } of remaining) {
      console.log(
        componentId,
        // componentDeps.get(id),
        [...componentInternalDeps.get(componentId)!].filter(
          (id) => !processed.has(id)
        )
      );
    }
    // throw new Error(
    //   `Metadata processor failed to process all components. Remaining: ${remaining.map(({ componentId }) => componentId).join(", ")}`
    // );
  }
}
