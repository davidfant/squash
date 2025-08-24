import type { Fiber } from "react-reconciler";
import { Metadata } from "../types";
import Tag = Metadata.ReactFiber.Component.Tag;

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

function sanitize(value: any, seen = new WeakSet<any>()): any {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (value === window) return "[Window]";
  if (typeof value === "object") {
    if (seen.has(value)) return "[Circular]";
    seen.add(value);
    if (typeof value.$$typeof === "symbol") {
      return `[$$typeof: ${value.$$typeof.toString()}]`;
    }
    if (value instanceof Element) {
      return "[Element]";
    }
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, sanitize(v, seen)])
    );
  }
  if (typeof value === "function") {
    return "[Function]";
  }
  return value;
}

export function reactFiber(): Metadata.ReactFiber | null {
  const root = findReactRoot();
  if (!root) return null;

  const metadata: Metadata.ReactFiber = {
    type: "react-fiber",
    code: {},
    components: {},
    nodes: {},
  };
  const ids = { code: 0, component: 0, node: 0 };

  const codeIdLookup = new Map<Function, number>();
  type CompKey = `${Tag}:${string}`; // Tag:codeId
  const compIdLookup = new Map<CompKey, number>();

  walkFrom<number>(root, (fiber, depth, parent) => {
    const add = <T extends Metadata.ReactFiber.Component.Any>({
      component: c,
      props = null,
      key,
    }: {
      component: T;
      key: CompKey;
      props?: Record<string, unknown> | string | null;
    }) => {
      const componentId = compIdLookup.get(key) ?? ids.component++;
      compIdLookup.set(key, componentId);

      const nodeId = ids.node++;
      metadata.components[componentId] = c;
      metadata.nodes[nodeId] = {
        componentId,
        props,
        parentId: parent ?? null,
      };
      return { component: componentId, node: nodeId };
    };
    switch (fiber.tag) {
      case Tag.HostRoot: {
        const ids = add({
          component: { tag: fiber.tag },
          key: `${Tag.HostRoot}:host`,
        });
        return ids.component;
      }
      case Tag.FunctionComponent:
      case Tag.MemoComponent:
      case Tag.SimpleMemoComponent:
      case Tag.ForwardRef: {
        const fn = getCode(fiber.elementType);
        if (!fn) {
          console.warn("Could not get code for", fiber.elementType);
          return;
        }

        const codeId = codeIdLookup.get(fn) ?? ids.code++;
        codeIdLookup.set(fn, codeId);
        metadata.code[codeId] = fn.toString();

        const id = add({
          component: {
            tag: fiber.tag,
            name: fiber.elementType.displayName ?? fiber.elementType.name,
            codeId,
          },
          key: `${fiber.tag}:${codeId}`,
          props: sanitize(fiber.memoizedProps),
        });
        return id.component;
      }
      case Tag.HostText: {
        const text = fiber.memoizedProps as string;
        const ids = add({
          component: { tag: fiber.tag },
          props: text,
          key: `${Tag.HostText}:text`,
        });
        return ids.component;
      }
      case Tag.DOMElement:
        if (parent !== undefined) {
          (fiber.stateNode as HTMLElement).setAttribute(
            "data-squash-parent-id",
            parent.toString()
          );
        }
        break;
      case Tag.ClassComponent: // TODO...
      case Tag.HostPortal:
      case Tag.Fragment:
      case Tag.SuspenseComponent:
      case Tag.SuspenseListComponent:
      case Tag.StrictMode:
      case Tag.ContextConsumer:
      case Tag.ContextProvider: // TODO: might want to do something w memoizedProps.value
      case Tag.LegacyHiddenComponent:
      case Tag.CacheComponent:
      case Tag.HostHoistable as any:
      case Tag.HostSingleton as any:
        break;
      default:
        console.log("unknown", fiber.tag, fiber);
    }
  });

  return metadata;
}
