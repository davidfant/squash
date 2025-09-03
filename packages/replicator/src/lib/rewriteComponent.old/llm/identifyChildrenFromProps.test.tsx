import { reactFiber } from "@/metadata/reactFiber";
import type { Metadata } from "@/types";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { identifyChildrenFromProps } from "./identifyChildrenFromProps";

describe("identifyChildrenFromProps", () => {
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

    const m = (await reactFiber())!;
    const componentId = (
      Object.keys(m!.components) as Metadata.ReactFiber.ComponentId[]
    ).find((id) => {
      const c = m!.components[id]!;
      return !!c && "name" in c && c.name === componentName;
    });
    if (!componentId) throw new Error(`Component ${componentName} not found`);

    const nodeIdsWithComponentId = (
      Object.keys(m!.nodes) as Metadata.ReactFiber.NodeId[]
    ).filter((nodeId) => m.nodes[nodeId]!.componentId === componentId);
    if (nodeIdsWithComponentId.length !== 1) {
      throw new Error(`Expected 1 node with componentId ${componentId}`);
    }

    return {
      metadata: m,
      matches: identifyChildrenFromProps(nodeIdsWithComponentId[0]!, m),
    };
  }

  const nodeIdsForComponent = (
    componentName: string,
    metadata: Metadata.ReactFiber
  ) => {
    const components = (
      Object.keys(metadata.components) as Metadata.ReactFiber.ComponentId[]
    ).filter((id) => {
      const c = metadata.components[id];
      return c && "name" in c && c.name === componentName;
    });
    return (Object.keys(metadata.nodes) as Metadata.ReactFiber.NodeId[]).filter(
      (nodeId) => components.includes(metadata.nodes[nodeId]?.componentId!)
    );
  };

  test("should identify basic child component", async () => {
    const Child = () => <div>Hello</div>;
    const Parent = ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    );
    const { metadata, matches } = await run(
      "Parent",
      <Parent>
        <Child />
      </Parent>
    );
    expect(matches).toEqual([
      {
        key: ["children"],
        nodeId: nodeIdsForComponent("Child", metadata)[0],
      },
    ]);
    // expect(matches).toEqual([{ key: ["children"], nodeId: "N3" }]);
  });

  test("should not identify child component with different props within parent", async () => {
    const Child = ({ text }: { text: string }) => <div>{text}</div>;
    const Parent = (_: { children: ReactNode }) => <Child text="within" />;
    const { matches } = await run(
      "Parent",
      <Parent>
        <Child text="from props" />
      </Parent>
    );
    expect(matches).toHaveLength(0);
  });

  test("should not identify child component with different children within parent", async () => {
    const Child = ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    );
    const Parent = (_: { children: ReactNode }) => (
      <Child>
        <p>within</p>
      </Child>
    );
    const { matches } = await run(
      "Parent",
      <Parent>
        <Child>
          <p>from props</p>
        </Child>
      </Parent>
    );
    expect(matches).toHaveLength(0);
  });

  test("should not identify child component with different tag within parent", async () => {
    const Child = ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    );
    const Parent = (_: { children: ReactNode }) => (
      <Child>
        <main />
      </Child>
    );
    const { matches } = await run(
      "Parent",
      <Parent>
        <Child>
          <section />
        </Child>
      </Parent>
    );
    expect(matches).toHaveLength(0);
  });

  // test.only("WIP", async () => {
  //   const Child = () => <div>child</div>;
  //   const Parent = ({ content }: { content: ReactNode }) => content;
  //   const GrandParent = ({ children }: { children: ReactNode }) => children;

  //   const { metadata, matches } = await run(
  //     "GrandParent",
  //     <GrandParent>
  //       <Parent content={<Child />} />
  //     </GrandParent>
  //   );
  //   expect(matches).toEqual([
  //     {
  //       key: ["children"],
  //       nodeId: nodeIdsForComponent("Parent", metadata)[0],
  //     },
  //   ]);

  //   //     ```javascript
  //   // import { Component23 } from "@/components/Component23";
  //   // import { TextTruncate } from "@/components/rewritten/C24/TextTruncate";
  //   // import { SmileOutlined } from "@/components/rewritten/C68/SmileOutlined";
  //   // export function Sample() {
  //   //   return (
  //   //     <Component23
  //   //       className="text-primary"
  //   //       component="span"
  //   //       onClick={null}
  //   //       style={{}}
  //   //     >
  //   //       <TextTruncate
  //   //         enabledMeasure={false}
  //   //         rows={1}
  //   //         text={<SmileOutlined />}
  //   //         width={0}
  //   //       />
  //   //     </Component23>
  //   //   );
  //   // }
  //   // ```

  //   // Output HTML
  //   // ```html
  //   // <span class="ant-typography text-primary"
  //   //   ><span role="img" aria-label="smile" class="anticon anticon-smile"
  //   //     ><svg
  //   //       viewBox="64 64 896 896"
  //   //       focusable="false"
  //   //       data-icon="smile"
  //   //       width="1em"
  //   //       height="1em"
  //   //       fill="currentColor"
  //   //       aria-hidden="true"
  //   //     >
  //   //       <path
  //   //         d="[[SVG:7|PATH:0|NAME:SmileyFace|DESCRIPTION:A circular emoticon with two round eyes and a curved smiling mouth.]]"
  //   //       ></path></svg></span
  //   // ></span>
  //   // ```
  // });

  // test("should identify basic child wrapped in div", async () => {
  //   const Child = () => <div>Hello</div>;
  //   const Parent = ({ children }: { children: ReactNode }) => (
  //     <div>{children}</div>
  //   );
  //   const { metadata, matches } = await run(
  //     "Parent",
  //     <Parent>
  //       <Child />
  //     </Parent>
  //   );
  //   expect(matches).toEqual([{ key: ["children"], nodeId: "N4" }]);
  // });

  test.todo("should fail child search if passes into another component");
});

/*

  if instance props contains children:
    recursively loop through children. for each react.*, expect to find it in nodes starting from the instance.nodeId. while looking in the nodes, we are allowed to skip nodes (e.g. bc of the node being something internal to the component we're working with), but the entire child tree should somehow be represented



  tests:
  1. if one component has multiple children, all paths need to match
  2. nested components that all add their own wrapping and have nested children
  

*/
