import * as prettier from "@/lib/prettier";
import { Metadata } from "@/types";
import type { Root } from "hast";
import rehypeParse from "rehype-parse";
import { unified } from "unified";

type NodeId = Metadata.ReactFiber.NodeId;
type ComponentId = Metadata.ReactFiber.ComponentId;
type CodeId = Metadata.ReactFiber.CodeId;

export type ReplicatorNodeStatus = "pending" | "valid" | "invalid";

export interface ComponentRegistryItem {
  id: ComponentId;
  dir: string;
  name: string;
  code: string;
}

export interface ReplicatorState {
  metadata: Metadata.ReactFiber;
  node: {
    all: Map<NodeId, Metadata.ReactFiber.Node & { id: NodeId }>;
    trees: Map<NodeId, Array<{ path: Array<string | number>; tree: Root }>>;
    status: Map<NodeId, ReplicatorNodeStatus>;
    ancestors: Map<NodeId, Set<NodeId>>;
    descendants: {
      all: Map<NodeId, Set<NodeId>>;
      fromProps: Map<
        NodeId,
        Array<{ nodeId: NodeId; keys: Array<string | number> }>
      >;
    };
    children: Map<NodeId, NodeId[]>;
  };
  component: {
    all: Map<
      ComponentId,
      Metadata.ReactFiber.Component.Any & { id: ComponentId }
    >;
    name: Map<ComponentId, string>;
    registry: Map<ComponentId, ComponentRegistryItem>;
    nodes: Map<ComponentId, NodeId[]>;
    fromCodeId: Map<CodeId, ComponentId>;
  };
  code: Map<CodeId, string>;
}

function buildAncestorsMap(
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

function buildDescendantsMap(
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

function buildChildrenMap(
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

export function buildDescendantsFromProps(
  nodes: Map<NodeId, Metadata.ReactFiber.Node>
): Map<NodeId, Array<{ nodeId: NodeId; keys: Array<string | number> }>> {
  const collect = (
    val: any,
    keys: Array<string | number>,
    out: Array<{ nodeId: NodeId; keys: Array<string | number> }>
  ): void => {
    if (Array.isArray(val)) {
      val.forEach((v, i) => collect(v, [...keys, i], out));
    } else if (typeof val === "object" && val !== null) {
      if (val.$$typeof === "react.component") {
        const el = val as Metadata.ReactFiber.PropValue.Component;
        if (el.nodeId) out.push({ nodeId: el.nodeId, keys });
      }
      // TODO: write a test to verify that this works
      if (val.$$typeof === "react.fragment") {
        const f = val as Metadata.ReactFiber.PropValue.Fragment;
        f.children.forEach((c, i) => collect(c, [...keys, i], out));
      }

      for (const [k, v] of Object.entries(val)) collect(v, [...keys, k], out);
    }
  };

  const provided = new Map<
    NodeId,
    Array<{ nodeId: NodeId; keys: Array<string | number> }>
  >();
  for (const [nodeId, node] of nodes.entries()) {
    const list = provided.get(nodeId) ?? [];
    collect(node.props, [], list);
    if (list.length) provided.set(nodeId, list);
  }

  return provided;
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

export async function buildState(
  html: string,
  metadata: Metadata.ReactFiber
): Promise<ReplicatorState> {
  const nodes = new Map(
    Object.entries(metadata.nodes).map(([id, n]) => [
      id as NodeId,
      { ...n, id: id as NodeId },
    ])
  );
  const components = new Map(
    Object.entries(metadata.components).map(([id, c]) => [
      id as ComponentId,
      { ...c, id: id as ComponentId },
    ])
  );
  const code = new Map(
    await Promise.all(
      Object.entries(metadata.code).map(
        async ([id, c]) => [id as CodeId, await prettier.js(`(${c})`)] as const
      )
    )
  );

  const children = buildChildrenMap(nodes);
  const ancestors = buildAncestorsMap(nodes);
  const descendants = {
    all: buildDescendantsMap(children),
    fromProps: buildDescendantsFromProps(nodes),
  };

  const componentIdByCodeId = new Map(
    [...components.entries()]
      .map(([cid, c]) =>
        "codeId" in c ? ([c.codeId, cid] as const) : undefined
      )
      .filter((v) => !!v)
  );
  const componentNodes = buildComponentNodesMap(nodes);

  const status = new Map<NodeId, ReplicatorNodeStatus>(
    [...nodes.entries()]
      .filter(([, n]) => {
        const c = components.get(n.componentId);
        return c && "codeId" in c;
      })
      .map(([id]) => [id, "pending"])
  );

  const trees = new Map<
    NodeId,
    Array<{ path: Array<string | number>; tree: Root }>
  >();
  const tree = unified().use(rehypeParse, { fragment: true }).parse(html);
  const hostRoot = [...nodes.values()].find(
    (n) =>
      components.get(n.componentId)?.tag ===
      Metadata.ReactFiber.Component.Tag.HostRoot
  );
  if (hostRoot) trees.set(hostRoot.id, [{ path: [], tree }]);

  return {
    metadata,
    node: { all: nodes, trees, status, ancestors, descendants, children },
    component: {
      all: components,
      name: new Map(
        [...components.entries()]
          .map(([id, c]) => [
            id,
            (() => {
              const { name } = c as Metadata.ReactFiber.Component.WithCode<any>;
              return name && name.length > 3 ? name : undefined;
            })(),
          ])
          .filter((v): v is [ComponentId, string] => !!v[1])
      ),
      // const componentName = (() => {
      //   if (state.component.registry.has(componentId)) {
      //     return state.component.registry.get(componentId)!.name;
      //   }
      //   const component = state.component.all.get(componentId)!;
      //   const name = (component as Metadata.ReactFiber.Component.WithCode<any>)
      //     .name;
      //   if (name && name.length > 3) return name;
      // })();
      registry: new Map(),
      nodes: componentNodes,
      fromCodeId: componentIdByCodeId,
    },
    code,
  };
}
