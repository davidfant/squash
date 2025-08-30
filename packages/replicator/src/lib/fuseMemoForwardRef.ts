import { Metadata } from "@/types";
import { buildChildMap } from "./traversal/util";

export function fuseMemoForwardRef(metadata: Metadata.ReactFiber) {
  const childMap = buildChildMap(metadata.nodes);
  const componentsToDelete = new Set<Metadata.ReactFiber.ComponentId>();

  Object.entries(metadata.nodes).forEach(([_parentNodeId, parentNode]) => {
    const parentNodeId = _parentNodeId as Metadata.ReactFiber.NodeId;
    const parentComp = metadata.components[parentNode.componentId];
    if (!parentComp) return;
    if (parentComp.tag !== Metadata.ReactFiber.Component.Tag.MemoComponent)
      return;
    const children = childMap.get(parentNodeId);
    if (children?.length !== 1) return;

    const childNodeId = children[0]!;
    const childNode = metadata.nodes[childNodeId];
    if (!childNode) return;

    const childComp = metadata.components[childNode.componentId];
    if (!childComp) return;
    if (childComp.tag !== Metadata.ReactFiber.Component.Tag.ForwardRef) return;
    if (childComp.codeId !== parentComp.codeId) return;

    childComp.name ??= parentComp.name;
    childNode.parentId = parentNode.parentId;
    delete metadata.nodes[parentNodeId];
    componentsToDelete.add(parentNode.componentId);
  });

  for (const componentId of componentsToDelete) {
    delete metadata.components[componentId];
  }
}
