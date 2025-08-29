import { forwardRef, lazy, memo, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { Metadata } from "../types";
import { reactFiber } from "./reactFiber";
import Tag = Metadata.ReactFiber.Component.Tag;

export function code(metadata: Metadata.ReactFiber, id: number) {
  const codeId = `F${id}` as const;
  const c = metadata.code[codeId];
  if (!c) throw new Error(`Code ${id} not found`);
  return { value: c, id: codeId };
}

export function component<T extends Metadata.ReactFiber.Component.Any>(
  metadata: Metadata.ReactFiber,
  id: number
) {
  const compId = `C${id}` as const;
  const c = metadata.components[compId];
  if (!c) throw new Error(`Component ${id} not found`);
  return { value: c as T, id: compId };
}

export function node(metadata: Metadata.ReactFiber, id: number) {
  const nodeId = `N${id}` as const;
  const n = metadata.nodes[nodeId];
  if (!n) throw new Error(`Node ${id} not found`);
  return { value: n, id: nodeId };
}

function expectElementNodeId(
  selector: string,
  expected: Metadata.ReactFiber.NodeId
) {
  const el = document.body.querySelector(selector);
  expect(el).toBeDefined();
  expect(el?.getAttribute("data-squash-node-id")).toBe(expected);
}

describe("reactFiber", () => {
  let root: Root;
  beforeEach(() => {
    document.body.innerHTML = "";
    root = createRoot(document.body);
  });
  afterEach(() => root.unmount());

  async function run(app: ReactNode) {
    root.render(app);
    await new Promise<void>((r) => {
      const check = () =>
        document.body.innerHTML ? r() : requestAnimationFrame(check);
      check();
    });
    const metadata = await reactFiber();
    return metadata!;
  }

  test("should add HostRoot component and tag the first DOM element", async () => {
    const metadata = await run(<div>Hello</div>);
    const c = component(metadata, 0);
    const nodes = {
      root: node(metadata, 0),
      div: node(metadata, 1),
    };
    expect(c.value).toEqual({ tag: Tag.HostRoot });

    expect(nodes.root.value).toEqual({
      componentId: c.id,
      parentId: null,
      props: null,
    });
    expectElementNodeId("div", nodes.div.id);
  });

  test.todo("should await loading lazy module");
  test.todo("should add data-squash-text wrapper to text nodes");

  describe("FunctionComponent", () => {
    test("should register component and tag its child", async () => {
      const C = () => <div>Hello</div>;
      const metadata = await run(<C />);
      const c = code(metadata, 0);
      const components = {
        C: component(metadata, 1),
        Cdiv: component(metadata, 2),
      };
      const nodes = {
        C: node(metadata, 1),
        Cdiv: node(metadata, 2),
      };

      expect(c.value).toBe(C.toString());
      expect(components.C.value).toEqual({
        tag: Tag.FunctionComponent,
        name: "C",
        codeId: c.id,
      });
      expect(components.Cdiv.value).toEqual({ tag: Tag.DOMElement });

      expect(nodes.C.value.componentId).toBe(components.C.id);
      expect(nodes.C.value.props).toEqual({});

      expect(nodes.Cdiv.value.componentId).toBe(components.Cdiv.id);
      expect(nodes.Cdiv.value.parentId).toBe(nodes.C.id);
      expectElementNodeId("div", nodes.Cdiv.id);
    });

    describe("props", () => {
      test("should add instance props", async () => {
        const C = ({ name }: { name: string }) => <div>{name}</div>;
        const metadata = await run(<C name="John" />);
        const n = node(metadata, 1);
        expect(n.value).toEqual({
          componentId: "C1",
          parentId: "N0",
          props: { name: "John" },
        });
      });

      test("should support array props", async () => {
        const C = ({ children }: { children: ReactNode[] }) => (
          <div>{children}</div>
        );
        const metadata = await run(<C children={[1, 2]} />);
        const n = node(metadata, 1);
        expect(n.value.props).toEqual({
          children: [1, 2],
        });
      });

      test("should strip out react elements (e.g. children)", async () => {
        const A = ({ children }: { children: ReactNode }) => children;
        const B = ({ children }: { children: ReactNode }) => children;
        const C = ({ children }: { visible: boolean; children: ReactNode }) =>
          children;
        const metadata = await run(
          <A>
            <B>
              <C visible>
                <div>Hello</div>
              </C>
            </B>
          </A>
        );
        const n = node(metadata, 1);
        expect(n.value).toEqual({
          componentId: "C1",
          parentId: "N0",
          props: {
            children: {
              $$typeof: "react.code",
              codeId: "F1",
              props: {
                children: {
                  $$typeof: "react.code",
                  codeId: "F2",
                  props: {
                    visible: true,
                    children: {
                      $$typeof: "react.tag",
                      tagName: "div",
                      props: { children: "Hello" },
                    },
                  },
                },
              },
            },
          },
        });
      });

      test("should register node nested in lazy/memo/forwardRef", async () => {
        const A = ({ children }: { children: ReactNode }) => children;
        const B = lazy(async () => ({
          default: memo(forwardRef(() => <div>Hello</div>)),
        }));
        const metadata = await run(
          <A>
            <B />
          </A>
        );
        const n = node(metadata, 1);
        expect(n.value).toEqual({
          componentId: "C1",
          parentId: "N0",
          props: {
            children: {
              $$typeof: "react.code",
              codeId: "F1",
              props: {},
            },
          },
        });
      });

      test("should strip out functions", async () => {
        const A = ({ onClick }: { onClick: () => void }) => (
          <div onClick={onClick}>Hello</div>
        );
        const metadata = await run(<A onClick={() => {}} />);
        const n = node(metadata, 1);
        expect(n.value).toEqual({
          componentId: "C1",
          parentId: "N0",
          props: { onClick: undefined },
        });
      });
    });

    test("should only register component once", async () => {
      const A = () => <div>A</div>;
      const B = () => <A />;
      const metadata = await run([<A key="a" />, <B key="b" />]);
      const components = {
        A: component(metadata, 1),
        Adiv: component(metadata, 2),
        B: component(metadata, 3),
      };
      const nodes = {
        A: node(metadata, 1),
        Adiv: node(metadata, 2),
        B: node(metadata, 3),
        BA: node(metadata, 4),
        BAdiv: node(metadata, 5),
      };

      expect(components.A.value).toEqual({
        tag: Tag.FunctionComponent,
        name: "A",
        codeId: "F0",
      });
      expect(components.Adiv.value).toEqual({ tag: Tag.DOMElement });
      expect(components.B.value).toEqual({
        tag: Tag.FunctionComponent,
        name: "B",
        codeId: "F1",
      });

      expect(nodes.A.value.componentId).toBe(components.A.id);
      expect(nodes.Adiv.value.componentId).toBe(components.Adiv.id);
      expect(nodes.B.value.componentId).toBe(components.B.id);
      expect(nodes.BA.value.componentId).toBe(components.A.id);
      expect(nodes.BAdiv.value.componentId).toBe(components.Adiv.id);
    });

    test("should have correct parentId", async () => {
      const A = () => <div>A</div>;
      const B = () => <A />;
      const metadata = await run([<A key="a" />, <B key="b" />]);

      const nodes = {
        root: node(metadata, 0),
        A: node(metadata, 1),
        Adiv: node(metadata, 2),
        B: node(metadata, 3),
        BA: node(metadata, 4),
        BAdiv: node(metadata, 5),
      };

      expect(nodes.A.value.parentId).toBe(nodes.root.id);
      expect(nodes.Adiv.value.parentId).toBe(nodes.A.id);
      expect(nodes.B.value.parentId).toBe(nodes.root.id);
      expect(nodes.BA.value.parentId).toBe(nodes.B.id);
      expect(nodes.BAdiv.value.parentId).toBe(nodes.BA.id);
    });
  });

  describe("ForwardRef", () => {
    test("should register component and tag its child", async () => {
      const C = forwardRef(() => <div>Hello</div>);
      const metadata = await run(<C />);
      const c = code(metadata, 0);
      const components = {
        C: component(metadata, 1),
        Cdiv: component(metadata, 2),
      };
      const nodes = {
        C: node(metadata, 1),
        Cdiv: node(metadata, 2),
      };

      expect(c.value).toBe((C as any).render.toString());
      expect(components.C.value).toEqual({
        tag: Tag.ForwardRef,
        name: undefined,
        codeId: c.id,
      });

      expect(nodes.C.value).toEqual({
        componentId: components.C.id,
        parentId: "N0",
        props: {},
      });
      expect(nodes.Cdiv.value).toEqual({
        componentId: components.Cdiv.id,
        parentId: nodes.C.id,
        props: null,
      });
      expectElementNodeId("div", nodes.Cdiv.id);
    });

    test("should have name set on function within forwardRef", async () => {
      const Inner = () => <div>Hello</div>;
      Inner.displayName = "Inner";
      const C = forwardRef(Inner);
      const metadata = await run(<C />);
      const comp = component(metadata, 1);

      expect(comp.value).toEqual({
        tag: Tag.ForwardRef,
        name: "Inner",
        codeId: "F0",
      });
    });
  });

  describe("Memo", () => {
    test("should register simple memo", async () => {
      const C = memo(() => <div>Hello</div>);
      const metadata = await run(<C />);
      const c = code(metadata, 0);
      const comp = component(metadata, 1);

      expect(c.value).toBe(C.type.toString());
      expect(comp.value).toEqual({
        tag: Tag.SimpleMemoComponent,
        name: undefined,
        codeId: c.id,
      });
    });

    test("should register complex memo, but only register code once", async () => {
      const C = memo(forwardRef(() => <div>Hello</div>));
      const metadata = await run(<C />);

      expect(Object.keys(metadata.code).length).toBe(1);

      const c = code(metadata, 0);
      const comps = {
        memo: component(metadata, 1),
        forwardRef: component(metadata, 2),
      };

      expect(comps.memo.value).toEqual({
        tag: Tag.MemoComponent,
        name: undefined,
        codeId: c.id,
      });
      expect(comps.forwardRef.value).toEqual({
        tag: Tag.ForwardRef,
        name: undefined,
        codeId: c.id,
      });
    });
  });

  describe("Portal", () => {
    let portalRoot: HTMLElement | undefined = undefined;
    beforeEach(() => {
      portalRoot = document.createElement("portal");
      document.documentElement.appendChild(portalRoot);
    });

    afterEach(() => portalRoot?.remove());

    test("should ignore traversing portals", async () => {
      const Portal = ({ children }: { children: ReactNode }) =>
        createPortal(children, portalRoot!);
      const metadata = await run(
        <div>
          <Portal>Hello</Portal>
        </div>
      );

      const portal = {
        component: component(metadata, 2),
        node: node(metadata, 2),
      };
      expect(portal.component.value).toEqual({
        tag: Tag.FunctionComponent,
        name: "Portal",
        codeId: "F0",
      });
      expect(
        Object.values(metadata.nodes).map((n) => n.parentId)
      ).not.toContain(portal.node.id);
    });
  });
});
