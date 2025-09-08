import { transform } from "@/lib/traversal/transform";
import type { Fiber } from "react-reconciler";
import { Metadata } from "../types";
import Tag = Metadata.ReactFiber.Component.Tag;

interface SanitizeContext {
  codeIdByFn: Map<Function, Metadata.ReactFiber.CodeId>;
  nodeIdByProps: Map<any, Metadata.ReactFiber.NodeId>;
  seen: WeakSet<any>;
  ancestors: any[];
}

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

async function walkFrom<T>(
  root: Fiber,
  visit: (
    fiber: Fiber,
    depth: number,
    parent?: T
  ) => Promise<{ parent?: T; skip?: boolean } | void>
) {
  let node: Fiber | null = root;
  let depth = 0;
  const parents: Array<T | undefined> = [undefined];

  while (node) {
    const currParent = parents.at(-1);
    const produced = await visit(node, depth, currParent);
    const nextParent = produced?.parent ?? currParent;
    const shouldSkip = produced?.skip ?? false;

    if (node.child && !shouldSkip) {
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

const toCode = async (
  fn: Function | null | undefined,
  props: Record<string, unknown>,
  ctx: SanitizeContext
): Promise<Metadata.ReactFiber.PropValue.Component> => {
  let nodeId: Metadata.ReactFiber.NodeId | null = null;
  if (ctx.nodeIdByProps.has(props)) {
    nodeId = ctx.nodeIdByProps.get(props) ?? null;
  } else {
    const matches = [...ctx.nodeIdByProps.entries()].filter(([p, _]) =>
      deepEqual(props, p)
    );
    if (matches.length === 1) {
      nodeId = matches[0]![1];
    }
  }
  return {
    $$typeof: "react.component",
    codeId: ctx.codeIdByFn.get(fn!) ?? null,
    nodeId,
    props: await sanitize(props, ctx),
  };
};

async function getCodeFn(el: any): Promise<Function | null | undefined> {
  if (typeof el === "function") return el;
  if (typeof el !== "object" || el === null) return null;

  switch (el.$$typeof) {
    case Symbol.for("react.context"):
      return null;
    case Symbol.for("react.memo"):
      return getCodeFn(el.type);
    case Symbol.for("react.forward_ref"):
      return el.render;
    case Symbol.for("react.lazy"):
      const loaded = await (async () => {
        try {
          return el._init(el._payload);
        } catch (error) {
          if (error instanceof Promise) return error;
          throw error;
        }
      })();

      if (loaded instanceof Array) {
        console.warn("Lazy components return an array", el, loaded);
        // Note(fant): this can return an array. e.g. cursor.com returns an array of meta, link, etc elements
        return null;
      } else if (typeof loaded === "object" && loaded?.__esModule) {
        return getCodeFn(loaded.default);
      }
      return getCodeFn(loaded);
  }
}

async function getElement(
  el: any,
  ctx: SanitizeContext
): Promise<Metadata.ReactFiber.PropValue.Any | null | undefined> {
  switch (el.$$typeof) {
    case Symbol.for("react.element"):
    case Symbol.for("react.transitional.element"): {
      if (typeof el.type === "string") {
        return {
          $$typeof: "react.tag",
          tagName: el.type,
          props: await sanitize(el.props, ctx),
        };
      } else if (el.type === Symbol.for("react.fragment")) {
        return {
          $$typeof: "react.fragment",
          children: await sanitize([el.props.children].flat(), ctx),
        };
      }

      const fn = await getCodeFn(el.type);
      return toCode(fn, el.props, ctx);
    }
    case Symbol.for("react.memo"): {
      const fn = await getCodeFn(el.type);
      return toCode(fn, el.props, ctx);
    }
    case Symbol.for("react.context"):
      return null;
    case Symbol.for("react.forward_ref"): {
      const fn = await getCodeFn(el);
      if (!el.props) {
        console.warn("No props available for forward ref", el, ctx.ancestors);
      }
      return toCode(fn, el.props || {}, ctx);
    }
    case Symbol.for("react.lazy"): {
      const loaded = await (async () => {
        try {
          return el._init(el._payload);
        } catch (error) {
          if (error instanceof Promise) return error;
          throw error;
        }
      })();

      if (loaded instanceof Array) {
        console.warn("Lazy components return an array", el, loaded);
        // Note(fant): this can return an array. e.g. cursor.com returns an array of meta, link, etc elements
        return null;
      } else if (typeof loaded === "object" && loaded?.__esModule) {
        return toCode(loaded.default, el.props, ctx);
      }
      const fn = await getCodeFn(el);
      return toCode(fn, el.props, ctx);
    }
  }
}

const sanitize = async (value: any, context: SanitizeContext): Promise<any> =>
  transform({
    value,
    visit: async (v, c): Promise<{ value: any } | undefined> => {
      if (v === window) return { value: "[Window]" };
      if (typeof v === "function") {
        const fn: Metadata.ReactFiber.PropValue.Function = {
          $$typeof: "function",
          fn: v.toString(),
          codeId: context.codeIdByFn.get(v) ?? null,
        };
        return { value: fn };
      }

      if (typeof v === "object" && v !== null) {
        if (c.seen.has(v)) return { value: "[Circular]" };
        c.seen.add(v);

        if (typeof (v as any)?.$$typeof === "symbol") {
          const el = await getElement(v, {
            ...c,
            ancestors: [...c.ancestors, v],
          });
          if (el !== undefined) return { value: el };

          console.warn("Failed to extract React element", v);
          return { value: `[$$typeof: ${(v as any).$$typeof.toString()}]` };
        }

        if (v instanceof Element) return { value: "[Element]" };
      }
    },
    context,
    buildNextContext: (v, c): SanitizeContext => ({
      ...c,
      ancestors: [...c.ancestors, v],
    }),
  });

function deepEqual(a: any, b: any) {
  // 1. Fast-path: identical reference or primitive equality
  if (a === b) return true;

  // 2. Handle Date & RegExp specifically
  if (a instanceof Date && b instanceof Date)
    return a.getTime() === b.getTime();
  if (a instanceof RegExp && b instanceof RegExp)
    return a.toString() === b.toString();

  // 3. If either isn’t an object (or is null) they differ
  if (
    a === null ||
    b === null ||
    typeof a !== "object" ||
    typeof b !== "object"
  ) {
    return false;
  }

  // 4. Arrays: length + element-wise check
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  // 5. Plain objects: compare keys + recurse on values
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
}

export async function reactFiber(): Promise<Metadata.ReactFiber | null> {
  const root = findReactRoot();
  if (!root) return null;

  const metadata: Metadata.ReactFiber = {
    type: "react-fiber",
    code: {},
    components: {},
    nodes: {},
  };
  const ids = { code: 0, component: 0, node: 0 };

  const codeIdByFn = new Map<Function, Metadata.ReactFiber.CodeId>();
  type CompKey = `${Tag}:${string}`; // Tag:codeId
  const compIdLookup = new Map<CompKey, Metadata.ReactFiber.ComponentId>();
  const nodeIdByFiber = new Map<Fiber, Metadata.ReactFiber.NodeId>();
  const nodeIdByProps = new Map<unknown, Metadata.ReactFiber.NodeId>();

  await walkFrom(root, async (fiber) => {
    const fn = await getCodeFn(fiber.type);
    if (!!fn) {
      const codeId = codeIdByFn.get(fn) ?? `F${ids.code++}`;
      codeIdByFn.set(fn, codeId);
    }

    const nodeId = `N${ids.node++}` as const;
    nodeIdByFiber.set(fiber, nodeId);
    if (
      [
        Tag.FunctionComponent,
        Tag.MemoComponent,
        Tag.SimpleMemoComponent,
        Tag.ForwardRef,
      ].includes(fiber.tag)
    ) {
      nodeIdByProps.set(fiber.memoizedProps, nodeId);
    }
  });

  await walkFrom<Metadata.ReactFiber.NodeId>(
    root,
    async (fiber, depth, parent) => {
      const nodeId = nodeIdByFiber.get(fiber);
      if (!nodeId) throw new Error("Node not found from fiber...");

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
          return { parent: ids.node };
        }
        case Tag.FunctionComponent:
        case Tag.MemoComponent:
        case Tag.SimpleMemoComponent:
        case Tag.ForwardRef: {
          const fn = await getCodeFn(fiber.elementType);
          if (!fn) {
            console.warn("Could not get code for", fiber.elementType);
            return;
          }

          const codeId = codeIdByFn.get(fn)!;
          metadata.code[codeId] = fn.toString();

          const id = add({
            component: {
              tag: fiber.tag,
              name: (fn as any).displayName ?? fiber.elementType.name,
              codeId,
            },
            key: `${fiber.tag}:${codeId}`,
            props: await sanitize(fiber.memoizedProps, {
              nodeIdByProps,
              codeIdByFn,
              seen: new WeakSet<any>(),
              ancestors: [],
            }),
          });
          return { parent: id.node };
        }
        case Tag.HostText: {
          const text = fiber.memoizedProps as string;
          const ids = add({
            component: { tag: fiber.tag },
            props: text,
            key: `${Tag.HostText}:text`,
          });
          const span = document.createElement("span");
          span.setAttribute("data-squash-text", "");
          span.setAttribute("data-squash-node-id", ids.node);
          span.style.display = "contents";
          const textNode = fiber.stateNode as Text;
          const clonedText = textNode.cloneNode(true);
          span.appendChild(clonedText);
          textNode.parentNode?.replaceChild(span, textNode);
          return { parent: ids.node };
        }
        case Tag.DOMElement: {
          const stateNode = fiber.stateNode as HTMLElement;
          const ids = add({
            component: {
              tag: fiber.tag,
              tagName: stateNode.tagName.toLowerCase(),
            },
            key: `${Tag.DOMElement}:${stateNode.tagName}`,
          });
          stateNode.setAttribute("data-squash-node-id", ids.node.toString());
          return { parent: ids.node };
        }
        case Tag.HostPortal:
          return { skip: true };
        case Tag.ClassComponent: // TODO...
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
    }
  );

  return metadata;
}
