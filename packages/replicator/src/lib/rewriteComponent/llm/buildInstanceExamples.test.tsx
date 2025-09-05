import { buildInitialComponentRegistry } from "@/lib/componentRegistry";
import { createRef } from "@/lib/recma/createRef";
import { reactFiber } from "@/metadata/reactFiber";
import type { Metadata } from "@/types";
import type { Element } from "hast";
import { createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import rehypeParse from "rehype-parse";
import { unified } from "unified";
import { find } from "unist-util-find";
import { buildInstanceExamples } from "./buildInstanceExamples";

describe("buildInstanceExamples", () => {
  let root: Root;
  beforeEach(() => {
    document.body.innerHTML = "";
    root = createRoot(document.body);
  });
  afterEach(() => root.unmount());

  async function run(componentName: string, node: ReactNode) {
    root.render(node);
    await new Promise<void>((r) => {
      const check = () =>
        document.body.innerHTML ? r() : requestAnimationFrame(check);
      check();
    });

    const m = await reactFiber();
    const html = document.documentElement.innerHTML;

    const componentId = (
      Object.keys(m!.components) as Metadata.ReactFiber.ComponentId[]
    ).find((id) => {
      const c = m!.components[id]!;
      return !!c && "name" in c && c.name === componentName;
    });
    if (!componentId) throw new Error(`Component ${componentName} not found`);

    const componentRegistry = buildInitialComponentRegistry(m!.components);
    const codeIdToComponentId = new Map(
      Object.entries(m!.components)
        .map(([cid, c]) =>
          "codeId" in c
            ? ([c.codeId, cid as Metadata.ReactFiber.ComponentId] as const)
            : undefined
        )
        .filter((v) => !!v)
    );

    return buildInstanceExamples(
      Object.entries(m!.nodes)
        .filter(([_, n]) => n.componentId === componentId)
        .map(([parentNodeId, parentNode]) => ({
          nodeId: parentNodeId as Metadata.ReactFiber.NodeId,
          children: [
            find(
              unified().use(rehypeParse, { fragment: true }).parse(html),
              (n) => {
                if (n.type !== "element") return false;
                const nodeId = (n as Element).properties?.dataSquashNodeId;
                const node = m!.nodes[nodeId as Metadata.ReactFiber.NodeId];
                return node?.parentId === parentNodeId;
              }
            )!,
          ],
          ref: createRef({
            componentId,
            props: parentNode.props as Record<string, unknown>,
            // @ts-expect-error
            ctx: { deps: new Set(), codeIdToComponentId, componentRegistry },
            children: [],
          }),
        })),
      componentRegistry,
      m!
    );
  }

  test("basic component", async () => {
    const Comp = () => <div>Hello</div>;
    const res = await run(
      "Comp",
      <main>
        <Comp />
      </main>
    );
    expect(res.length).toBe(1);
    expect(res[0]?.html.full).toEqual(res[0]?.html.limited);
    expect(res[0]?.jsx.full).toEqual(res[0]?.jsx.limited);
    expect(res[0]?.html.full).toBe("<div>Hello</div>");
    expect(res[0]?.jsx).toMatchSnapshot();
  });

  // test.only("should dedupe react element provided in props", async () => {
  //   const Child = () => <div>Hello</div>;
  //   const Parent = ({ children }: { children: ReactNode }) => (
  //     <div>{children}</div>
  //   );
  //   const res = await run(
  //     "Parent",
  //     <Parent>
  //       <Child />
  //     </Parent>
  //   );
  //   expect(res.length).toBe(1);
  //   console.log(res);
  //   expect(res[0]?.jsx.limited).toMatchSnapshot();
  //   expect(res[0]?.html.limited).toMatchSnapshot();
  // });

  describe("limit depth", () => {
    test("max 2 levels of react components", async () => {
      const Child = ({
        children,
        depth,
      }: {
        children: ReactNode;
        depth: number;
      }) => <div data-depth={depth}>{children}</div>;
      const Parent = ({ children }: { children: ReactNode }) => (
        <div>{children}</div>
      );
      const res = await run(
        "Parent",
        <Parent>
          <Child depth={1}>
            <Child depth={2}>to be redacted</Child>
          </Child>
        </Parent>
      );
      expect(res.length).toBe(1);
      expect(res[0]?.html.full).not.toEqual(res[0]?.html.limited);
      expect(res[0]?.jsx.full).not.toEqual(res[0]?.jsx.limited);
      expect(res[0]?.html.full).toMatchSnapshot();
      expect(res[0]?.html.limited).toMatchSnapshot();
      expect(res[0]?.jsx.full).toMatchSnapshot();
      expect(res[0]?.jsx.limited).toMatchSnapshot();
    });

    test.only("should not count ref tags in HTML", async () => {
      const Child = ({ children }: { children: ReactNode }) => children;
      const Parent = ({ children }: { children: ReactNode }) => (
        <div>{children}</div>
      );
      const ref = (children: ReactNode) => createElement("ref", null, children);
      const res = await run(
        "Parent",
        <Parent>
          <Child>
            {Array.from({ length: 10 }).reduce<ReactNode>(
              (acc) => ref(acc),
              "not redacted"
            )}
          </Child>
        </Parent>
      );
      expect(res.length).toBe(1);
      expect(res[0]?.html.full).toEqual(`<div>not redacted</div>`);
      expect(res[0]?.html.limited).toEqual(`<div>not redacted</div>`);
    });

    test("should not redact children if component has no children", async () => {
      const Child = ({
        children,
        depth,
      }: {
        children?: ReactNode;
        depth: number;
      }) => <div data-depth={depth}>{children}</div>;
      const Parent = ({ children }: { children: ReactNode }) => (
        <div>{children}</div>
      );
      const res = await run(
        "Parent",
        <Parent>
          <Child depth={1}>
            <Child depth={2}></Child>
          </Child>
        </Parent>
      );
      expect(res.length).toBe(1);
      expect(res[0]?.jsx.full).toEqual(res[0]?.jsx.limited);
      expect(res[0]?.jsx.full).toMatchSnapshot();
    });

    test("should reset the limit for props that are not children", async () => {
      throw new Error("TODO");
    });

    test("max 10 levels of DOM elements, if at least one react component is present", async () => {
      const Child = ({ children }: { children: ReactNode }) => children;
      const Parent = ({ children }: { children: ReactNode }) => children;
      const res = await run(
        "Parent",
        <Parent>
          <div className="1">
            <div className="2">
              <div className="3">
                <Child>
                  <div className="4">
                    <div className="5">
                      <div className="6">
                        <div className="7">
                          <div className="8">
                            <div className="9">
                              <div className="10">
                                <div className="bottom" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Child>
              </div>
            </div>
          </div>
        </Parent>
      );
      expect(res.length).toBe(1);
      expect(res[0]?.html.full).not.toEqual(res[0]?.html.limited);
      expect(res[0]?.jsx.full).not.toEqual(res[0]?.jsx.limited);
      expect(res[0]?.html.full).toMatchSnapshot();
      expect(res[0]?.html.limited).toMatchSnapshot();
      expect(res[0]?.jsx.full).toMatchSnapshot();
      expect(res[0]?.jsx.limited).toMatchSnapshot();
    });

    test("DOM elements not limited if no react components are present", async () => {
      const Parent = ({ children }: { children: ReactNode }) => children;
      const res = await run(
        "Parent",
        <Parent>
          <div className="1">
            <div className="2">
              <div className="3">
                <div className="4">
                  <div className="5">
                    <div className="6">
                      <div className="7">
                        <div className="8">
                          <div className="9">
                            <div className="10">
                              <div className="not redacted" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Parent>
      );
      expect(res[0]?.html.full).toEqual(res[0]?.html.limited);
      expect(res[0]?.jsx.full).toEqual(res[0]?.jsx.limited);
      expect(res[0]?.html.full).toMatchSnapshot();
      expect(res[0]?.html.limited).toMatchSnapshot();
      expect(res[0]?.jsx.full).toMatchSnapshot();
      expect(res[0]?.jsx.limited).toMatchSnapshot();
    });
  });
});
