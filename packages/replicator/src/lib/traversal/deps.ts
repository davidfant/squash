import type { Metadata } from "@/types";
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

function buildNodeComponentsFromProps(
  nodes: Map<NodeId, Metadata.ReactFiber.Node>,
  components: Map<ComponentId, Metadata.ReactFiber.Component.Any>
): Map<NodeId, Set<ComponentId>> {
  /* ------------------------------------------------------------------ */
  /* 1.  codeId → componentId lookup (fast O(#components))              */
  /* ------------------------------------------------------------------ */
  const codeIdToComponent = new Map<Metadata.ReactFiber.CodeId, ComponentId>();
  for (const [compId, comp] of components.entries()) {
    if (componentHasCode(comp)) {
      codeIdToComponent.set(comp.codeId, compId);
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
  const provided = new Map<NodeId, Set<ComponentId>>();
  for (const [nodeId, node] of nodes.entries()) {
    const set = provided.get(nodeId) ?? new Set<ComponentId>();
    collect(node.props, set);
    if (set.size > 0) provided.set(nodeId, set);
  }

  return provided;
}

export function getNodeInternalDeps(
  metadata: Metadata.ReactFiber
): Map<NodeId, Set<ComponentId>> {
  const nodes = nodesMap(metadata.nodes);
  const components = componentsMap(metadata.components);
  const children = buildChildMap(nodes);
  const descendants = buildDescendantsMap(children);
  const nodeComponentsFromProps = buildNodeComponentsFromProps(
    nodes,
    components
  );
  const nodeDepths = calcNodeDepths(nodes);
  const nodesByDepth = [...nodes.entries()].sort(
    ([a], [b]) => nodeDepths.get(b)! - nodeDepths.get(a)!
  );

  const nodeInternalDeps = new Map<NodeId, Set<ComponentId>>();
  for (const [nodeId, node] of nodesByDepth) {
    const nodeDescendants = descendants.get(nodeId) ?? [];
    const componentDescendants = [...nodeDescendants]
      .map((nodeId) => nodes.get(nodeId)!.componentId)
      .filter((componentId) => componentHasCode(components.get(componentId)!));

    const nodeDescendantInternalDeps = [...nodeDescendants]
      .filter((nodeId) =>
        componentHasCode(components.get(nodes.get(nodeId)!.componentId)!)
      )
      .map((nodeId) => nodeInternalDeps.get(nodeId) ?? new Set<ComponentId>())
      .reduce(
        (acc, curr) => new Set([...acc, ...curr]),
        new Set<ComponentId>()
      );

    const componentsFromProps =
      nodeComponentsFromProps.get(nodeId) ?? new Set();

    const internalComponents = new Set(
      [...componentDescendants].filter(
        (id) =>
          !componentsFromProps.has(id) && !nodeDescendantInternalDeps.has(id)
      )
    );

    nodeInternalDeps.set(nodeId, internalComponents);
  }

  return nodeInternalDeps;
}

export function getComponentInternalDeps(
  metadata: Metadata.ReactFiber,
  nodeInternalDeps: Map<NodeId, Set<ComponentId>>
) {
  const nodes = nodesMap(metadata.nodes);
  const componentNodes = buildComponentNodesMap(nodes);
  const componentInternalDeps = new Map<ComponentId, Set<ComponentId>>();
  for (const [componentId, nodes] of componentNodes) {
    if (!componentInternalDeps.has(componentId)) {
      componentInternalDeps.set(componentId, new Set());
    }
    nodes.forEach((nodeId) =>
      nodeInternalDeps
        .get(nodeId)
        ?.forEach((cid) => componentInternalDeps.get(componentId)?.add(cid))
    );
  }

  return componentInternalDeps;
}

export function getAllDeps(
  metadata: Metadata.ReactFiber,
  internalDeps: Map<ComponentId, Set<ComponentId>>
): Map<ComponentId, Set<ComponentId>> {
  const nodes = nodesMap(metadata.nodes);
  const components = componentsMap(metadata.components);
  const children = buildChildMap(nodes);
  const descendants = buildDescendantsMap(children);

  const allDeps = new Map<ComponentId, Set<ComponentId>>();
  descendants.forEach((descNodeIds, nodeId) => {
    const componentId = nodes.get(nodeId)!.componentId;
    if (!allDeps.has(componentId)) {
      allDeps.set(componentId, new Set());
    }
    descNodeIds.forEach((descNodeId) => {
      const descCompId = nodes.get(descNodeId)!.componentId;
      if (componentHasCode(components.get(descCompId)!)) {
        allDeps.get(componentId)?.add(descCompId);
      }
    });
  });

  nodes.forEach((node, nodeId) => {
    const compId = node.componentId;
    if (!allDeps.has(compId)) {
      allDeps.set(compId, new Set());
    }

    descendants.get(nodeId)?.forEach((descendantId) => {
      const descendant = nodes.get(descendantId);
      if (!descendant) return;
      internalDeps
        .get(descendant.componentId)
        ?.forEach((internalCompId) => allDeps.get(compId)?.add(internalCompId));
    });
  });

  return allDeps;
}
