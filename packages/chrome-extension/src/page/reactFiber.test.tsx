import { Metadata } from "@squash/replicator";
import { forwardRef, memo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { reactFiber } from "./reactFiber";
import Tag = Metadata.ReactFiber.Component.Tag;

const root = createRoot(document.body);

async function setup(app: ReactNode) {
  root.render(app);
  await new Promise((r) => requestAnimationFrame(r));
  const metadata = reactFiber()!;
  return metadata;
}

function code(metadata: Metadata.ReactFiber, id: number) {
  const c = metadata.code[id];
  if (!c) throw new Error(`Code ${id} not found`);
  return { value: c, id };
}

function component(metadata: Metadata.ReactFiber, id: number) {
  const c = metadata.components[id];
  if (!c) throw new Error(`Component ${id} not found`);
  return { value: c, id };
}

function node(metadata: Metadata.ReactFiber, id: number) {
  const n = metadata.nodes[id];
  if (!n) throw new Error(`Node ${id} not found`);
  return { value: n, id };
}

function expectParentNodeId(selector: string, expected: number) {
  const el = document.body.querySelector(selector);
  expect(el).toBeDefined();
  expect(el?.getAttribute("data-squash-parent-id")).toBe(expected.toString());
}

describe("reactFiber", () => {
  it("should add HostRoot component and tag the first DOM element", async () => {
    const metadata = await setup(<div>Hello</div>);
    const c = component(metadata, 0);
    const n = node(metadata, 0);
    expect(c.value).toEqual({ tag: Tag.HostRoot });

    expect(n.value).toEqual({ componentId: c.id, parentId: null, props: null });
    expect(n.value.props).toBeNull();

    expectParentNodeId("div", n.id);
  });

  describe("FunctionComponent", () => {
    it("should register component and tag its child", async () => {
      const C = () => <div>Hello</div>;
      const metadata = await setup(<C />);
      const c = code(metadata, 0);
      const comp = component(metadata, 1);
      const n = node(metadata, 1);

      expect(c.value).toBe(C.toString());
      expect(comp.value).toEqual({
        tag: Tag.FunctionComponent,
        name: "C",
        codeId: c.id,
      });

      expect(n.value.componentId).toBe(comp.id);
      expect(n.value.props).toEqual({});
      expectParentNodeId("div", n.id);
    });

    describe("props", () => {
      it("should add instance props", async () => {
        const C = ({ name }: { name: string }) => <div>{name}</div>;
        const metadata = await setup(<C name="John" />);
        const n = node(metadata, 1);
        expect(n.value).toEqual({
          componentId: 1,
          parentId: 0,
          props: { name: "John" },
        });
      });

      it("should strip out react elements (e.g. children)", async () => {
        const A = ({ children }: { children: ReactNode }) => (
          <div>{children}</div>
        );
        const B = () => <div>Hello</div>;
        const metadata = await setup(
          <A>
            <B />
          </A>
        );
        const n = node(metadata, 1);
        expect(n.value).toEqual({
          componentId: 1,
          parentId: 0,
          props: { children: "[$$typeof: Symbol(react.transitional.element)]" },
        });
      });

      it("should strip out functions", async () => {
        const A = ({ onClick }: { onClick: () => void }) => (
          <div onClick={onClick}>Hello</div>
        );
        const metadata = await setup(<A onClick={() => {}} />);
        const n = node(metadata, 1);
        expect(n.value).toEqual({
          componentId: 1,
          parentId: 0,
          props: { onClick: "[Function]" },
        });
      });
    });

    it("should only register component once", async () => {
      const A = () => <div>A</div>;
      const B = () => <A />;
      const metadata = await setup([<A key="a" />, <B key="b" />]);
      const a = component(metadata, 1);
      const b = component(metadata, 2);

      expect(a.value).toEqual({
        tag: Tag.FunctionComponent,
        name: "A",
        codeId: 0,
      });

      expect(b.value).toEqual({
        tag: Tag.FunctionComponent,
        name: "B",
        codeId: 1,
      });

      expect(node(metadata, 1).value.componentId).toBe(a.id);
      expect(node(metadata, 2).value.componentId).toBe(b.id);
      expect(node(metadata, 3).value.componentId).toBe(a.id);
    });

    it("should have correct parentId", async () => {
      const A = () => <div>A</div>;
      const B = () => <A />;
      const metadata = await setup([<A key="a" />, <B key="b" />]);

      const a = component(metadata, 1);
      const b = component(metadata, 2);

      expect(node(metadata, 1).value).toEqual({
        componentId: a.id,
        parentId: 0,
        props: {},
      });
      expect(node(metadata, 2).value).toEqual({
        componentId: b.id,
        parentId: 0,
        props: {},
      });
      expect(node(metadata, 3).value).toEqual({
        componentId: a.id,
        parentId: 2,
        props: {},
      });
    });
  });

  describe("ForwardRef", () => {
    it("should register component and tag its child", async () => {
      const C = forwardRef(() => <div>Hello</div>);
      const metadata = await setup(<C />);
      const c = code(metadata, 0);
      const comp = component(metadata, 1);
      const n = node(metadata, 1);

      expect(c.value).toBe((C as any).render.toString());
      expect(comp.value).toEqual({
        tag: Tag.ForwardRef,
        name: undefined,
        codeId: c.id,
      });

      expect(n.value.componentId).toBe(comp.id);
      expect(n.value.props).toEqual({});
      expectParentNodeId("div", n.id);
    });
  });

  describe("memo", () => {
    it("should register simple memo", async () => {
      const C = memo(() => <div>Hello</div>);
      const metadata = await setup(<C />);
      const c = code(metadata, 0);
      const comp = component(metadata, 1);

      expect(c.value).toBe(C.type.toString());
      expect(comp.value).toEqual({
        tag: Tag.SimpleMemoComponent,
        name: undefined,
        codeId: c.id,
      });
    });

    it("should register complex memo, but only register code once", async () => {
      const C = memo(forwardRef(() => <div>Hello</div>));
      const metadata = await setup(<C />);

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
});
