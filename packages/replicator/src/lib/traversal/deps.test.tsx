import { reactFiber } from "@/metadata/reactFiber";
import type { Metadata } from "@/types";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  getAllDeps,
  getComponentInternalDeps,
  getNodeInternalDeps,
} from "./deps";

describe("deps", () => {
  let root: Root;
  beforeEach(() => {
    document.body.innerHTML = "";
    root = createRoot(document.body);
  });
  afterEach(() => root.unmount());

  const run = async (node: ReactNode) => {
    root.render(node);
    await new Promise<void>((r) => {
      const check = () =>
        document.body.innerHTML ? r() : requestAnimationFrame(check);
      check();
    });
    const m = await reactFiber();
    const internalDeps = getNodeInternalDeps(m!);
    const allDeps = getAllDeps(m!, getComponentInternalDeps(m!, internalDeps));

    const componentIdToName = (id: Metadata.ReactFiber.ComponentId) =>
      (m?.components[id] as Metadata.ReactFiber.Component.WithCode<any>).name;
    return {
      internal: Object.fromEntries(
        [...internalDeps.entries()].map(([nodeId, deps]) => [
          componentIdToName(m!.nodes[nodeId]!.componentId),
          [...deps].map(componentIdToName),
        ])
      ),
      all: Object.fromEntries(
        [...allDeps.entries()].map(([componentId, deps]) => [
          componentIdToName(componentId),
          [...deps].map(componentIdToName),
        ])
      ),
    };
  };

  describe("getInternalDeps", () => {
    test("should not include components provided via props", async () => {
      const Child = () => <div>Hello</div>;
      const Parent = ({ children }: { children: ReactNode }) => children;
      const GrandParent = ({ children }: { children: ReactNode }) => children;

      const deps = await run(
        <GrandParent>
          <Parent>
            <Child />
          </Parent>
        </GrandParent>
      );
      expect(deps.internal["Child"]).toEqual([]);
      expect(deps.internal["Parent"]).toEqual([]);
      expect(deps.internal["GrandParent"]).toEqual([]);
    });

    test("Parent renders Child internally", async () => {
      const Child = () => <div>Hello</div>;
      const Parent = () => <Child />;
      const GrandParent = () => <Parent />;

      const deps = await run(<GrandParent />);
      expect(deps.internal["Child"]).toEqual([]);
      expect(deps.internal["Parent"]).toEqual(["Child"]);
      expect(deps.internal["GrandParent"]).toEqual(["Parent"]);
    });

    test("GrandParent passes Child explicitly through Parent prop", async () => {
      const Child = () => <div>Hello</div>;
      const Parent = ({ children }: { children: React.ReactNode }) => children;
      const GrandParent = () => (
        <Parent>
          <Child />
        </Parent>
      );

      const deps = await run(<GrandParent />);
      expect(deps.internal["Child"]).toEqual([]);
      expect(deps.internal["Parent"]).toEqual([]);
      expect(deps.internal["GrandParent"]).toEqual(["Parent", "Child"]);
    });

    test("child wrapped in DOM element is internal dep", async () => {
      const Child = () => <div>Hello</div>;
      const Parent = () => (
        <div>
          <Child />
        </div>
      );
      const deps = await run(<Parent />);
      expect(deps.internal["Child"]).toEqual([]);
      expect(deps.internal["Parent"]).toEqual(["Child"]);
    });
  });

  describe("getAllDeps", () => {
    test("should include internal deps of child components", async () => {
      const Child = () => <div>Hello</div>;
      const Parent = () => <Child />;
      const GrandParent = () => <Parent />;

      const deps = await run(<GrandParent />);
      expect(deps.all["Child"]).toEqual([]);
      expect(deps.all["Parent"]).toEqual(["Child"]);
      expect(deps.all["GrandParent"]).toEqual(["Parent", "Child"]);
    });

    test("should include components from props", async () => {
      const Child = () => <div>Hello</div>;
      const Parent = ({ children }: { children: ReactNode }) => children;

      const deps = await run(
        <Parent>
          <Child />
        </Parent>
      );
      expect(deps.all["Child"]).toEqual([]);
      expect(deps.all["Parent"]).toEqual(["Child"]);
    });

    test("should include internal deps of child components, even if not used in the parent", async () => {
      const True = () => <div>Hello</div>;
      const False = () => <div>Hello</div>;
      const Parent = ({ value }: { value: boolean }) =>
        value ? <True /> : <False />;
      const GrandParent = () => <Parent value={true} />;

      const deps = await run(
        <>
          <GrandParent />
          <Parent value={false} />
        </>
      );
      expect(deps.all["True"]).toEqual([]);
      expect(deps.all["False"]).toEqual([]);
      expect(deps.all["Parent"]).toEqual(["True", "False"]);
      expect(deps.all["GrandParent"]).toEqual(["Parent", "True", "False"]);
    });

    test("should include component provided in props but not rendered", async () => {
      const NotRenderedInComp = () => "not rendered";
      const Comp = (_: { children: ReactNode }) => <div />;

      const deps = await run(
        <>
          <Comp>
            <NotRenderedInComp />
          </Comp>
          <NotRenderedInComp />
        </>
      );
      expect(deps.all["NotRenderedInComp"]).toEqual([]);
      expect(deps.all["Comp"]).toEqual(["NotRenderedInComp"]);
    });
  });
});
