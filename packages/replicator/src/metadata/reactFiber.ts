import type { Fiber } from "react-reconciler";
import { Metadata } from "../types";
import Tag = Metadata.ReactFiber.Component.Tag;

interface SanitizeContext {
  codeIdLookup: Map<Function, Metadata.ReactFiber.CodeId>;
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
  visit: (fiber: Fiber, depth: number, parent?: T) => Promise<T | undefined>
) {
  let node: Fiber | null = root;
  let depth = 0;
  const parents: Array<T | undefined> = [undefined];

  while (node) {
    const currParent = parents.at(-1);
    const produced = await visit(node, depth, currParent);
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

const toCode = async (
  fn: Function | null | undefined,
  props: Record<string, unknown>,
  ctx: SanitizeContext
): Promise<Metadata.ReactFiber.Element.Code> => ({
  $$typeof: "react.code",
  codeId: ctx.codeIdLookup.get(fn!) ?? null,
  props: await sanitize(props, ctx),
});

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
): Promise<Metadata.ReactFiber.Element.Any | null | undefined> {
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

async function sanitize(value: any, ctx: SanitizeContext): Promise<any> {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (value === window) return "[Window]";
  if (Array.isArray(value)) {
    return Promise.all(
      value.map((v) =>
        sanitize(v, { ...ctx, ancestors: [...ctx.ancestors, value] })
      )
    );
  }
  if (typeof value === "object" && value !== null) {
    if (ctx.seen.has(value)) return "[Circular]";
    ctx.seen.add(value);

    if (typeof value.$$typeof === "symbol") {
      const el = await getElement(value, {
        ...ctx,
        ancestors: [...ctx.ancestors, value],
      });
      if (el) return el;
      // if (el === undefined) {
      console.warn("Failed to extract React element", value);
      // }
      return `[$$typeof: ${value.$$typeof.toString()}]`;
    }
    if (value instanceof Element) {
      return "[Element]";
    }
    return Object.fromEntries(
      await Promise.all(
        Object.entries(value).map(
          async ([k, v]) =>
            [
              k,
              await sanitize(v, {
                ...ctx,
                ancestors: [...ctx.ancestors, value],
              }),
            ] as const
        )
      )
    );
  }
  if (typeof value === "function") {
    return undefined;
    // return { $$typeof: "function", function: value.toString() };
  }
  return value;
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

  const codeIdLookup = new Map<Function, Metadata.ReactFiber.CodeId>();
  type CompKey = `${Tag}:${string}`; // Tag:codeId
  const compIdLookup = new Map<CompKey, Metadata.ReactFiber.ComponentId>();

  await walkFrom(root, async (fiber) => {
    const fn = await getCodeFn(fiber.type);
    if (!fn) return;
    const codeId = codeIdLookup.get(fn) ?? `F${ids.code++}`;
    codeIdLookup.set(fn, codeId);
  });

  await walkFrom<Metadata.ReactFiber.NodeId>(
    root,
    async (fiber, depth, parent) => {
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
          const fn = await getCodeFn(fiber.elementType);
          if (!fn) {
            console.warn("Could not get code for", fiber.elementType);
            return;
          }

          const codeId = codeIdLookup.get(fn)!;
          metadata.code[codeId] = fn.toString();

          const id = add({
            component: {
              tag: fiber.tag,
              name: (fn as any).displayName ?? fiber.elementType.name,
              codeId,
            },
            key: `${fiber.tag}:${codeId}`,
            props: await sanitize(fiber.memoizedProps, {
              codeIdLookup,
              seen: new WeakSet<any>(),
              ancestors: [],
            }),
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
          const span = document.createElement("span");
          span.setAttribute("data-squash-text", "");
          span.setAttribute("data-squash-node-id", ids.node);
          span.style.display = "contents";
          const textNode = fiber.stateNode as Text;
          const clonedText = textNode.cloneNode(true);
          span.appendChild(clonedText);
          textNode.parentNode?.replaceChild(span, textNode);
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
    }
  );

  return metadata;
}
