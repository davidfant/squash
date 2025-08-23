import { ReactFiber } from "@/types";
import { forwardRef, memo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { reactFiber } from "./reactFiber";
import Tag = ReactFiber.Component.Tag;

const root = createRoot(document.body);

async function setup(app: ReactNode) {
  root.render(app);
  await new Promise((r) => requestAnimationFrame(r));
  const snapshot = reactFiber()!;
  return snapshot;
}

function component(snapshot: ReactFiber.Snapshot, id: number) {
  const c = snapshot.components[id];
  if (!c) throw new Error(`Component ${id} not found`);
  return { value: c, id };
}

function node(snapshot: ReactFiber.Snapshot, id: number) {
  const n = snapshot.nodes[id];
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
    const snapshot = await setup(<div>Hello</div>);
    const c = component(snapshot, 0);
    const n = node(snapshot, 0);
    expect(c.value).toEqual({ tag: Tag.HostRoot });

    expect(n.value).toEqual({ componentId: c.id, props: null });
    expect(n.value.props).toBeNull();

    expectParentNodeId("div", n.id);
  });

  describe("FunctionComponent", () => {
    it("should register component and tag its child", async () => {
      const C = () => <div>Hello</div>;
      const snapshot = await setup(<C />);
      const c = component(snapshot, 1);
      const n = node(snapshot, 1);

      expect(c.value).toEqual({
        tag: Tag.FunctionComponent,
        name: "C",
        code: C.toString(),
      });

      expect(n.value.componentId).toBe(c.id);
      expect(n.value.props).toEqual({});
      expectParentNodeId("div", n.id);
    });

    it("should add instance props", async () => {
      const C = ({ name }: { name: string }) => <div>{name}</div>;
      const snapshot = await setup(<C name="John" />);
      const n = node(snapshot, 1);
      expect(n.value).toEqual({ componentId: 1, props: { name: "John" } });
    });

    it("should only register component once", async () => {
      const A = () => <div>A</div>;
      const B = () => (
        <div>
          <A />
        </div>
      );
      const snapshot = await setup(
        <>
          <A />
          <B />
        </>
      );
      const a = component(snapshot, 1);
      const b = component(snapshot, 2);

      expect(a.value).toEqual({
        tag: Tag.FunctionComponent,
        name: "A",
        code: A.toString(),
      });

      expect(b.value).toEqual({
        tag: Tag.FunctionComponent,
        name: "B",
        code: B.toString(),
      });

      expect(node(snapshot, 1).value.componentId).toBe(a.id);
      expect(node(snapshot, 2).value.componentId).toBe(b.id);
      expect(node(snapshot, 3).value.componentId).toBe(a.id);
    });
  });

  describe("ForwardRef", () => {
    it("should register component and tag its child", async () => {
      const C = forwardRef(() => <div>Hello</div>);
      const snapshot = await setup(<C />);
      const c = component(snapshot, 1);
      const n = node(snapshot, 1);

      expect(c.value).toEqual({
        tag: Tag.ForwardRef,
        name: undefined,
        code: (C as any).render.toString(),
      });

      expect(n.value.componentId).toBe(c.id);
      expect(n.value.props).toEqual({});
      expectParentNodeId("div", n.id);
    });
  });

  describe("memo", () => {
    it("should register simple memo", async () => {
      const C = memo(() => <div>Hello</div>);
      const snapshot = await setup(<C />);
      const c = component(snapshot, 1);

      expect(c.value).toEqual({
        tag: Tag.SimpleMemoComponent,
        name: undefined,
        code: C.type.toString(),
      });
    });

    it("should register complex memo", async () => {
      const C = memo(forwardRef(() => <div>Hello</div>));
      const snapshot = await setup(<C />);
      const c = component(snapshot, 1);

      expect(c.value).toEqual({
        tag: Tag.MemoComponent,
        name: undefined,
        code: (C as any).type.render.toString(),
      });
    });
  });
});
