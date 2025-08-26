import { reactFiber } from "@/metadata/reactFiber";
import { forwardRef, memo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { describe, test } from "vitest";
import { replicate } from "..";
import { expectFileToMatchSnapshot, TestSink } from "./replicate.test";

const root = createRoot(document.body);

const run = async (node: ReactNode) => {
  root.render(node);
  await new Promise((r) => requestAnimationFrame(r));

  const sink = new TestSink();
  const metadata = reactFiber();
  const html = document.documentElement.innerHTML;
  const page = { url: "http://localhost", title: "Test", html };
  await replicate({ page, metadata }, sink);
  return sink.finalize();
};

describe("replicate with react fiber", () => {
  test("should create App.tsx", async () => {
    // const A = () => <div>Hello</div>;
    // const B = ({ children }: { children: ReactNode }) => <div>{children}</div>;
    // const files = await test([
    //   <A key="a" />,
    //   <B key="b">
    //     <A />
    //   </B>,
    // ]);
    const files = await run(<div>Hello</div>);
    expectFileToMatchSnapshot(files, "src/App.tsx");
  });

  test("should create a component", async () => {
    const Comp = () => <div>Hello</div>;
    const files = await run(<Comp />);
    expectFileToMatchSnapshot(files, "src/components/Comp.tsx");
    expectFileToMatchSnapshot(files, "src/App.tsx");
  });

  test.todo("should work if no DOM element is rendered aside from text");

  test("should only create one component if renders same component multiple times", async () => {
    const CompA = () => <div>Hello</div>;
    const files = await run([<CompA key="1" />, <CompA key="2" />]);
    expectFileToMatchSnapshot(files, "src/components/CompA.tsx");
    expectFileToMatchSnapshot(files, "src/App.tsx");
  });

  test("should only create one component for memo(forwardRef(function))", async () => {
    const A = memo(forwardRef(() => <div>Hello</div>));
    const files = await run(<A />);
    expectFileToMatchSnapshot(files, "src/components/Component2.tsx");
    expectFileToMatchSnapshot(files, "src/App.tsx");
  });

  test("should not create a component when returning null", async () => {
    const CompA = () => null;
    const files = await run(
      <div>
        <CompA />
      </div>
    );
    expectFileToMatchSnapshot(files, "src/App.tsx");
  });

  test("should create component when one instance returns null and another returns jsx", async () => {
    const Comp = ({ enabled }: { enabled: boolean }) =>
      enabled ? <div>Hello</div> : null;
    const files = await run([
      <Comp key="1" enabled={true} />,
      <Comp key="2" enabled={false} />,
    ]);
    expectFileToMatchSnapshot(files, "src/App.tsx");
    expectFileToMatchSnapshot(files, "src/components/Comp.tsx");
  });

  test("should create nested components", async () => {
    const CompA = () => <div>Hello</div>;
    const CompB = () => (
      <div>
        <CompA />
      </div>
    );
    const files = await run(<CompB />);
    expectFileToMatchSnapshot(files, "src/components/CompA.tsx");
    expectFileToMatchSnapshot(files, "src/components/CompB.tsx");
    expectFileToMatchSnapshot(files, "src/App.tsx");
  });

  test("should support inline functions", async () => {
    const Comp = () => (
      <>
        {[1, 2, 3].map((x) => (
          <div key={x}>{x}</div>
        ))}
        {(() => (
          <div>Hello</div>
        ))()}
      </>
    );
    const files = await run(<Comp />);
    expectFileToMatchSnapshot(files, "src/components/Comp.tsx");
    expectFileToMatchSnapshot(files, "src/App.tsx");
  });

  test.todo(
    "should throw an error if same data-squash-parent-id nodes existing in different parents",
    () => {}
  );

  test.todo("should remove components that just return children");
  test.todo("should pull out SVGs into separate components");

  describe("props", () => {
    test("simple props are defined in call site", async () => {
      const Comp = (_: any) => <div />;
      const files = await run(
        <Comp
          enabled
          string="text"
          number={-1}
          array={[1, 2, 3]}
          object={{ a: 1, b: 2 }}
        />
      );
      expectFileToMatchSnapshot(files, "src/components/Comp.tsx");
      expectFileToMatchSnapshot(files, "src/App.tsx");
    });

    test("should recreate children that are react elements", async () => {
      const CompA = ({ children }: { children: ReactNode }) => children;
      const CompB = ({ children }: { children: ReactNode }) => children;
      const files = await run(
        <CompA>
          <CompB>
            <div>Hello</div>
          </CompB>
        </CompA>
      );
      // TODO: test to make sure that A and B just renders children
      // expectFileToMatchSnapshot(files, "src/components/A.tsx");
      // expectFileToMatchSnapshot(files, "src/components/B.tsx");
      expectFileToMatchSnapshot(files, "src/App.tsx");
    });

    test.todo(
      "should use props.children instead of redeclaring children in component body",
      async () => {
        // <A>wow</A> should have a component A that just returns props.children, not "wow"
        // To do this, find all react elements that are provided through props. Then traverse the rendered children to detect which segments look 100% like a react element from the props. If that's the case for all nodes with that component, then we can just use that prop value.
      }
    );

    test("should convert tabIndex to number", async () => {
      const files = await run(<div tabIndex={"1" as any} />);
      expectFileToMatchSnapshot(files, "src/App.tsx");
    });

    test("should not get stuck if core component creates what looks like circular deps", async () => {
      const Common = ({ children }: { children: ReactNode }) => (
        <div role="common">{children}</div>
      );
      // Child depends on Common, Parent depends on Common and Child. Common "seems" to depend on Child based on its children in the DOM, but we should exclude components as deps that come from props
      const Child = () => <Common>child</Common>;
      const Parent = () => (
        <div>
          <Common>
            <Child />
          </Common>
        </div>
      );
      const files = await run(<Parent />);
      expectFileToMatchSnapshot(files, "src/components/Common.tsx");
      expectFileToMatchSnapshot(files, "src/components/Child.tsx");
      expectFileToMatchSnapshot(files, "src/components/Parent.tsx");
      expectFileToMatchSnapshot(files, "src/App.tsx");
    });
  });

  describe("naming", () => {
    test("should support multiple components with same name", async () => {
      const CompA = () => <div>Hello</div>;
      CompA.displayName = "Dupe";
      const CompB = () => <div>Yellow</div>;
      CompB.displayName = "Dupe";

      const files = await run([<CompA key="a" />, <CompB key="b" />]);
      expectFileToMatchSnapshot(files, "src/components/Dupe1.tsx");
      expectFileToMatchSnapshot(files, "src/components/Dupe2.tsx");
      expectFileToMatchSnapshot(files, "src/App.tsx");
    });

    test("should use default name if component name length < 3", async () => {
      const A = () => <div>Hello</div>;
      const files = await run(<A />);
      expectFileToMatchSnapshot(files, "src/components/Component1.tsx");
    });

    test("should TitleCase component name", async () => {
      const Comp = () => <div>Hello</div>;
      Comp.displayName = "componentName";
      const files = await run(<Comp />);
      expectFileToMatchSnapshot(files, "src/components/ComponentName.tsx");
    });

    test("should put component with . in the name in a directory", async () => {
      const Comp = () => <div>Hello</div>;
      Comp.displayName = "Primitive.div";
      const files = await run(<Comp />);
      expectFileToMatchSnapshot(files, "src/components/primitive/Div.tsx");
    });

    test.todo("should rewrite component", () => {});
    test.todo("should rewrite component bottoms up", () => {});
  });
});
