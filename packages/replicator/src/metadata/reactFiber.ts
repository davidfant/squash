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

function getCode(el: any): Function | null | undefined {
  if (typeof el.type === "function") return el.type;
  if (
    typeof el === "object" &&
    el !== null &&
    el.type === Symbol.for("react.suspense")
  ) {
    return getCode({ type: el.props.children });
  }
  if (
    typeof el.type === "object" &&
    el.type !== null &&
    "$$typeof" in el.type
  ) {
    switch (el.type.$$typeof) {
      case Symbol.for("react.memo"):
        return getCode(el.type);
      case Symbol.for("react.forward_ref"):
        return el.type.render;
      case Symbol.for("react.lazy"):
        const loaded = el.type._init(el.type._payload);
        if (loaded instanceof Array) {
          console.warn("Lazy components return an array", el, loaded);
          // Note(fant): this can return an array. e.g. cursor.com returns an array of meta, link, etc elements
          return null;
        }
        return getCode({ type: loaded });
      case Symbol.for("react.context"):
        return null;
    }
  }

  // if (el.elementType === Symbol.for("react.strict_mode")) return undefined;
  // if (el.elementType === Symbol.for("react.suspense")) return undefined;
  // if (typeof el.type === "string") return undefined;
}

function sanitize(
  value: any,
  codeIdLookup: Map<Function, Metadata.ReactFiber.CodeId>,
  seen = new WeakSet<any>()
): any {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (value === window) return "[Window]";
  if (Array.isArray(value)) {
    return value.map((v) => sanitize(v, codeIdLookup, seen));
  }
  if (typeof value === "object" && value !== null) {
    if (seen.has(value)) return "[Circular]";
    seen.add(value);

    if (value.$$typeof === Symbol.for("react.context")) {
      return null;
    } else if (value.$$typeof === Symbol.for("react.lazy")) {
      const loaded = value._init(value._payload);
      return getCode({ type: loaded });
    } else if (typeof value.$$typeof === "symbol") {
      if ("type" in value) {
        if (typeof value.type === "string") {
          return {
            $$typeof: "react.tag",
            tagName: value.type,
            props: sanitize(value.props, codeIdLookup, seen),
          } satisfies Metadata.ReactFiber.Element.Tag;
        } else if (value.type === Symbol.for("react.fragment")) {
          const children = Array.isArray(value.props.children)
            ? value.props.children
            : [value.props.children];
          return {
            $$typeof: "react.fragment",
            children: children.map((c: any) => sanitize(c, codeIdLookup, seen)),
          } satisfies Metadata.ReactFiber.Element.Fragment;
        }

        const code = getCode(value);
        if (code) {
          return {
            $$typeof: "react.code",
            codeId: codeIdLookup.get(code) ?? null,
            props: sanitize(value.props, codeIdLookup, seen),
          } satisfies Metadata.ReactFiber.Element.Code;
        } else if (code === null) {
          return null;
        }
      }

      console.warn("Failed to extract React element", value);
      return `[$$typeof: ${value.$$typeof.toString()}]`;
    }
    if (value instanceof Element) {
      return "[Element]";
    }
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        sanitize(v, codeIdLookup, seen),
      ])
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

  const codeIdLookup = new Map<Function, Metadata.ReactFiber.CodeId>();
  type CompKey = `${Tag}:${string}`; // Tag:codeId
  const compIdLookup = new Map<CompKey, Metadata.ReactFiber.ComponentId>();

  walkFrom(root, (fiber) => {
    const fn = getCode(fiber);
    if (!fn) return;
    const codeId = codeIdLookup.get(fn) ?? `F${ids.code++}`;
    codeIdLookup.set(fn, codeId);
  });

  walkFrom<Metadata.ReactFiber.NodeId>(root, (fiber, depth, parent) => {
    const add = <T extends Metadata.ReactFiber.Component.Any>({
      component: c,
      props = null,
      key,
    }: {
      component: T;
      key: CompKey;
      props?: Record<string, unknown> | string | null;
    }) => {
      const componentId = compIdLookup.get(key) ?? `C${ids.component++}`;
      compIdLookup.set(key, componentId);

      const nodeId = `N${ids.node++}` as const;
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
        return ids.node;
      }
      case Tag.FunctionComponent:
      case Tag.MemoComponent:
      case Tag.SimpleMemoComponent:
      case Tag.ForwardRef: {
        const fn = getCode(fiber);
        if (!fn) {
          console.warn("Could not get code for", fiber.elementType);
          return;
        }

        const codeId = codeIdLookup.get(fn)!;
        metadata.code[codeId] = fn.toString();

        const id = add({
          component: {
            tag: fiber.tag,
            name: fiber.elementType.displayName ?? fiber.elementType.name,
            codeId,
          },
          key: `${fiber.tag}:${codeId}`,
          props: sanitize(fiber.memoizedProps, codeIdLookup),
        });
        return id.node;
      }
      case Tag.HostText: {
        const text = fiber.memoizedProps as string;
        const ids = add({
          component: { tag: fiber.tag },
          props: text,
          key: `${Tag.HostText}:text`,
        });
        return ids.node;
      }
      case Tag.DOMElement: {
        const ids = add({
          component: { tag: fiber.tag },
          key: `${Tag.DOMElement}:native`,
        });
        (fiber.stateNode as HTMLElement).setAttribute(
          "data-squash-node-id",
          ids.node.toString()
        );
        return ids.node;
      }
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
