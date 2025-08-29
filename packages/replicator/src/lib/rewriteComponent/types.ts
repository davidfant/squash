import type { Metadata } from "@/types";
import type { Element } from "hast";
import type {
  ComponentRegistry,
  ComponentRegistryItem,
} from "../componentRegistry";

export interface RewriteComponentOptions {
  component: { id: Metadata.ReactFiber.ComponentId; code: string };
  instances: Array<{ ref: Element; children: Element[] }>;
  componentRegistry: ComponentRegistry;
}

export type RewriteComponentStrategy = (
  opts: RewriteComponentOptions
) => Promise<{ code: string; registry: ComponentRegistryItem }>;
