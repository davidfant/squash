import { buildChildMap, componentsMap, nodesMap } from "@/lib/traversal/util";
import type { Metadata } from "@/types";

interface Context {
  nodes: Map<Metadata.ReactFiber.NodeId, Metadata.ReactFiber.Node>;
  codeIdToComponentId: Map<
    Metadata.ReactFiber.CodeId,
    Metadata.ReactFiber.ComponentId
  >;
  childMap: Map<Metadata.ReactFiber.NodeId, Metadata.ReactFiber.NodeId[]>;
}

const nextChild = (
  match: (node: Metadata.ReactFiber.Node) => boolean,
  parentNodeId: Metadata.ReactFiber.NodeId,
  ctx: Context
): {
  id: Metadata.ReactFiber.NodeId;
  node: Metadata.ReactFiber.Node;
} | null => {
  let stack = [...(ctx.childMap.get(parentNodeId) ?? [])];

  while (stack.length > 0) {
    const nodeId = stack.shift()!;
    const node = ctx.nodes.get(nodeId);
    if (node && match(node)) return { id: nodeId, node };

    const children = ctx.childMap.get(nodeId) ?? [];
    stack.push(...children);
  }

  return null;
};

const isEqual = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);

function recurse(
  value: any,
  key: Array<string | number>,
  parentNodeId: Metadata.ReactFiber.NodeId,
  ctx: Context
): Array<{
  key: Array<string | number>;
  match: boolean;
  nodeId: Metadata.ReactFiber.NodeId | null;
}> {
  console.log("recurse", { key, parentNodeId, value });
  if (Array.isArray(value)) {
    return value.flatMap((v) => recurse(v, key, parentNodeId, ctx));
  } else if (typeof value === "object" && value !== null) {
    if (value.$$typeof === "react.component") {
      const el = value as Metadata.ReactFiber.PropValue.Component;
      // TODO: what do we do here?
      if (!el.codeId) return [{ key, match: true, nodeId: null }];

      // starting from the parent node, find the next child that is of this block type
      const next = nextChild(
        (node) => node.componentId === ctx.codeIdToComponentId.get(el.codeId!),
        parentNodeId,
        ctx
      );
      console.log("next?", {
        codeId: el.codeId,
        compId: ctx.codeIdToComponentId.get(el.codeId!),
        next,
        nextProps: next?.node.props,
        elProps: el.props,
      });
      // TODO: compare next.node.props and el.props somehow
      if (!next) return [{ key, match: true, nodeId: null }];
      if (!isEqual(next.node.props, el.props)) {
        return [{ key, match: false, nodeId: null }];
      }
      const match = recurse(next.node.props, [], next.id, ctx).every(
        (m) => m.match
      );
      return [{ key, match, nodeId: next.id }];
    }
    if (value.$$typeof === "react.tag") {
      // if matches, the next one needs to be immediate there isn't any hidden fluff within normal tags
    }
    if (value.$$typeof === "react.fragment") {
    }

    return Object.entries(value).flatMap(([k, v]) =>
      recurse(v, [...key, k], parentNodeId, ctx)
    );
  }

  return [];

  /*
  
  const collect = (val: any, out: Set<ComponentId>): void => {
    if (Array.isArray(val)) {
      for (const v of val) collect(v, out);
    } else if (typeof val === "object" && val !== null) {
      if (val.$$typeof === "react.component") {
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

  const provided = new Map<NodeId, Set<ComponentId>>();
  for (const [nodeId, node] of nodes.entries()) {
    const set = provided.get(nodeId) ?? new Set<ComponentId>();
    collect(node.props, set);
    if (set.size > 0) provided.set(nodeId, set);
  }

  return provided;
  
  */
}

export function identifyChildrenFromProps(
  nodeId: Metadata.ReactFiber.NodeId,
  metadata: Metadata.ReactFiber
): Array<{
  key: Array<string | number>;
  nodeId: Metadata.ReactFiber.NodeId;
}> {
  const nodes = nodesMap(metadata.nodes);
  const childMap = buildChildMap(nodes);
  const components = componentsMap(metadata.components);
  const codeIdToComponentId = new Map(
    [...components.entries()]
      .map(([cid, c]) =>
        "codeId" in c ? ([c.codeId, cid] as const) : undefined
      )
      .filter((v) => !!v)
  );

  const node = nodes.get(nodeId);
  const recursed = recurse(node?.props, [], nodeId, {
    nodes,
    childMap,
    codeIdToComponentId,
  });
  console.log("recursed", recursed);
  return recursed
    .filter((r) => r.match)
    .map((r) => ({ key: r.key, nodeId: r.nodeId! }));
}
