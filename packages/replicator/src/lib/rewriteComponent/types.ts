import type { Metadata } from "@/types";
import type { Element } from "hast";
import type {
  ComponentRegistry,
  ComponentRegistryItem,
} from "../componentRegistry";

export interface RewriteComponentInstance {
  ref: Element;
  children: Element[];
}

export interface RewriteComponentOptions {
  component: {
    id: Metadata.ReactFiber.ComponentId;
    code: string;
    deps: Set<Metadata.ReactFiber.ComponentId>;
  };
  instances: RewriteComponentInstance[];
  componentRegistry: ComponentRegistry;
}

export type RewriteComponentStrategy = (
  opts: RewriteComponentOptions
) => Promise<ComponentRegistryItem>;
