import { ReactFiber } from "@/types";
import type { Fiber } from "react-reconciler";

function getFiberFromElement(el: Element): Fiber | null {
  for (let key in el) {
    if (
      key.startsWith("__reactFiber$") ||
      key.startsWith("__reactInternalInstance$")
    ) {
      return el[key as keyof typeof el] as Fiber | null;
    }
  }
  return null;
}

function getReactRootFiber(el: Element): Fiber | null {
  let fiber = getFiberFromElement(el);
  while (fiber?.return) fiber = fiber.return;
  return fiber;
}

function findReactRoot() {
  const all = document.querySelectorAll("*");
  for (const el of all) {
    const fiber = getFiberFromElement(el);
    if (fiber) {
      const root = getReactRootFiber(el);
      if (root?.stateNode?.containerInfo && root.tag === 3) {
        return root;
      }
    }
  }
  return null;
}

function walkFrom<T>(
  root: Fiber,
  visit: (fiber: Fiber, depth: number, parent?: T) => T | undefined
) {
  let node: Fiber | null = root;
  let depth = 0;
  const parents: Array<T | undefined> = [undefined];

  while (node) {
    const currParent = parents.at(-1);
    const produced = visit(node, depth, currParent);
    const nextParent = produced ?? currParent;

    if (node.child) {
      parents.push(nextParent);
      node = node.child;
      depth++;
      continue;
    }

    while (node && !node.sibling) {
      if (!node.return) return;
      node = node.return;
      depth--;
      parents.pop();
    }

    if (node && node.sibling) {
      node = node.sibling;
    }
  }
}

function getCode(elementType: any): Function | undefined {
  if (typeof elementType === "function") return elementType;
  if (typeof elementType === "object" && "$$typeof" in elementType) {
    // if is Symbol(react.memo)
    if (elementType.$$typeof === Symbol.for("react.memo")) {
      return getCode(elementType.type);
    }
    if (elementType.$$typeof === Symbol.for("react.forward_ref")) {
      return elementType.render;
    }
  }
}

export function reactFiber(): ReactFiber.Snapshot | null {
  const root = findReactRoot();
  if (!root) return null;

  const snapshot: ReactFiber.Snapshot = {
    type: "react-fiber",
    components: {},
    nodes: {},
  };
  let componentId = 0;
  let nodeId = 0;

  const componentIdLookup = new Map<
    `${ReactFiber.Component.Tag}:${string | undefined}`,
    Map<unknown, number>
  >();
  walkFrom<number>(root, (fiber, depth, parent) => {
    const add = <T extends ReactFiber.Component.Any>({
      component: c,
      props = null,
      key,
    }: {
      component: T;
      key?: unknown;
      props?: Record<string, unknown> | string | null;
    }) => {
      const tagNameKey = `${c.tag}:${
        "name" in c ? c.name : undefined
      }` as const;
      if (!componentIdLookup.has(tagNameKey)) {
        componentIdLookup.set(tagNameKey, new Map<unknown, number>());
      }
      const tagNameLookup = componentIdLookup.get(tagNameKey)!;

      const cid = tagNameLookup.get(key) ?? componentId++;
      tagNameLookup.set(key, cid);

      const nid = nodeId++;
      snapshot.components[cid] = c;
      snapshot.nodes[nid] = { componentId: cid, props };
      return { component: cid, node: nid };
    };
    switch (fiber.tag) {
      case ReactFiber.Component.Tag.HostRoot: {
        const ids = add({ component: { tag: fiber.tag } });
        return ids.component;
      }
      case ReactFiber.Component.Tag.FunctionComponent:
      case ReactFiber.Component.Tag.MemoComponent:
      case ReactFiber.Component.Tag.SimpleMemoComponent:
      case ReactFiber.Component.Tag.ForwardRef: {
        const fn = getCode(fiber.elementType);
        const ids = add({
          component: {
            tag: fiber.tag,
            name: fiber.elementType.displayName ?? fiber.elementType.name,
            code: fn?.toString(),
          },
          key: fn,
          props: fiber.memoizedProps,
        });
        return ids.component;
      }
      case ReactFiber.Component.Tag.HostText: {
        const text = fiber.memoizedProps as string;
        const ids = add({
          component: { tag: fiber.tag },
          props: text,
          key: "text",
        });
        return ids.component;
      }
      case ReactFiber.Component.Tag.DOMElement:
        if (parent !== undefined) {
          (fiber.stateNode as HTMLElement).setAttribute(
            "data-squash-parent-id",
            parent.toString()
          );
        }
        break;
      case ReactFiber.Component.Tag.ClassComponent: // TODO...
      case ReactFiber.Component.Tag.HostPortal:
      case ReactFiber.Component.Tag.Fragment:
      case ReactFiber.Component.Tag.SuspenseComponent:
      case ReactFiber.Component.Tag.SuspenseListComponent:
      case ReactFiber.Component.Tag.StrictMode:
      case ReactFiber.Component.Tag.ContextConsumer:
      case ReactFiber.Component.Tag.ContextProvider: // TODO: might want to do something w memoizedProps.value
      case ReactFiber.Component.Tag.LegacyHiddenComponent:
      case ReactFiber.Component.Tag.HostHoistable as any:
      case ReactFiber.Component.Tag.HostSingleton as any:
        break;
      default:
        console.log("unknown", fiber.tag, fiber);
    }
  });

  return snapshot;
}
