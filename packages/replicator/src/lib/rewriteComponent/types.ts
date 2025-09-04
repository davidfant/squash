import type { Metadata } from "@/types";
import type { Element } from "hast";
import type {
  ComponentRegistry,
  ComponentRegistryItem,
} from "../componentRegistry";

export interface RewriteComponentInstance {
  nodeId: Metadata.ReactFiber.NodeId;
  ref: Element;
  children: Element[];
}

export interface RewriteComponentOptions {
  component: {
    id: Metadata.ReactFiber.ComponentId;
    code: string;
    deps: {
      internal: Set<Metadata.ReactFiber.ComponentId>;
      all: Set<Metadata.ReactFiber.ComponentId>;
    };
  };
  metadata: Metadata.ReactFiber;
  instances: RewriteComponentInstance[];
  componentRegistry: ComponentRegistry;
}

export type RewriteComponentStrategy = (
  opts: RewriteComponentOptions
) => Promise<
  (Partial<ComponentRegistryItem> & Pick<ComponentRegistryItem, "code">) | null
>;
// ) => Promise<{
//   registry: Map<
//     ComponentId,
//     Partial<ComponentRegistryItem> & Pick<ComponentRegistryItem, "code">
//   >;
//   nodeComponents?: Map<ComponentId, ComponentRegistryItem>;
// }>;
