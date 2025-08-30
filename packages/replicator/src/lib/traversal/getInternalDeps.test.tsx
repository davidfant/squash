import { reactFiber } from "@/metadata/reactFiber";
import type { Metadata } from "@/types";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ComponentId } from "../recma/replaceRefs";
import { getInternalDeps } from "./getInternalDeps";

describe("getInternalDeps", () => {
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
    const internalDeps = getInternalDeps(m!);

    const componentIdToName = (id: ComponentId) =>
      (m?.components[id] as Metadata.ReactFiber.Component.WithCode<any>).name;
    return Object.fromEntries(
      [...internalDeps.entries()].map(([nodeId, deps]) => [
        componentIdToName(m!.nodes[nodeId]!.componentId),
        [...deps].map(componentIdToName),
      ])
    );
  };

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
    expect(deps["Child"]).toEqual([]);
    expect(deps["Parent"]).toEqual([]);
    expect(deps["GrandParent"]).toEqual([]);
  });

  test("Parent renders Child internally", async () => {
    const Child = () => <div>Hello</div>;
    const Parent = () => <Child />;
    const GrandParent = () => <Parent />;

    const deps = await run(<GrandParent />);
    expect(deps["Child"]).toEqual([]);
    expect(deps["Parent"]).toEqual(["Child"]);
    expect(deps["GrandParent"]).toEqual(["Parent"]);
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
    expect(deps["Child"]).toEqual([]);
    expect(deps["Parent"]).toEqual([]);
    expect(deps["GrandParent"]).toEqual(["Parent", "Child"]);
  });
});
