import type { Metadata } from "@/types";
import { buildNodeDescendantsFromProps } from "./traversal/deps";
import {
  buildChildMap,
  buildComponentNodesMap,
  buildDescendantsMap,
  componentsMap,
  nodesMap,
} from "./traversal/util";

export interface RewritableComponentInfo {
  componentId: Metadata.ReactFiber.ComponentId;
  rewritable: boolean;
  /* Descendants of *all* nodes in this component */
  descendantValid: number;
  descendantTotal: number;
  /* Components referenced from props */
  // propComponentValid: number;
  // propComponentTotal: number;

  nodeStats: Map<
    Metadata.ReactFiber.NodeId,
    Record<
      "valid" | "invalid" | "pending",
      Set<Metadata.ReactFiber.ComponentId>
    >
  >;
}

export function getRewritableComponents(
  metadata: Metadata.ReactFiber,
  nodeStatus: Map<Metadata.ReactFiber.NodeId, "pending" | "valid" | "invalid">
) {
  const nodes = nodesMap(metadata.nodes);
  const components = componentsMap(metadata.components);
  const componentNodes = buildComponentNodesMap(nodes);
  const children = buildChildMap(nodes);
  const descendants = buildDescendantsMap(children);
  const nodesFromProps = buildNodeDescendantsFromProps(nodes, components);

  const componentIsValid = new Map<Metadata.ReactFiber.ComponentId, boolean>();
  for (const [cid, nodeIds] of componentNodes) {
    componentIsValid.set(
      cid,
      nodeIds.every((nid) => nodeStatus.get(nid) === "valid")
    );
  }

  const result = new Map<
    Metadata.ReactFiber.ComponentId,
    RewritableComponentInfo
  >();

  for (const [cid, component] of components) {
    if (!("codeId" in component)) continue;
    const nodeIds = componentNodes.get(cid) ?? [];
    if (!nodeIds.every((id) => nodeStatus.get(id) === "pending")) continue;

    /* ---- (1) unique descendant nodes ---- */
    const descendantSet = new Set<Metadata.ReactFiber.NodeId>();
    for (const nid of nodeIds) {
      for (const d of descendants.get(nid) ?? []) {
        if (nodeStatus.get(d)) {
          descendantSet.add(d);
        }
      }
    }
    // remove all descendants that come from nodes provided by props
    [...nodesFromProps.values()]
      .flatMap((n) => [...n])
      .flatMap((n) => [...(descendants.get(n) ?? [])])
      .forEach((n) => descendantSet.delete(n));

    const descendantTotal = descendantSet.size;
    let descendantValid = 0;
    for (const d of descendantSet) {
      if (nodeStatus.get(d) === "valid") descendantValid++;
    }

    const nodeStats = new Map<
      Metadata.ReactFiber.NodeId,
      Record<
        "valid" | "invalid" | "pending",
        Set<Metadata.ReactFiber.ComponentId>
      >
    >();

    for (const nid of nodeIds) {
      const statusCounts: Record<
        "valid" | "invalid" | "pending",
        Set<Metadata.ReactFiber.ComponentId>
      > = {
        valid: new Set(),
        invalid: new Set(),
        pending: new Set(),
      };

      for (const d of descendants.get(nid) ?? []) {
        const status = nodeStatus.get(d);
        if (!status) continue;
        statusCounts[status].add(nodes.get(d)!.componentId);
      }

      nodeStats.set(nid, statusCounts);
    }

    /* ---- (3) rewritable decision ---- */
    // const rewritable =
    //   descendantValid === descendantTotal &&
    //   propComponentValid === propComponentTotal;

    result.set(cid, {
      componentId: cid,
      rewritable: descendantValid === descendantTotal,
      descendantValid,
      descendantTotal,
      // propComponentValid,
      // propComponentTotal,
      nodeStats,
    });
  }

  return result;
}
