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
    const A = () => <div>Hello</div>;
    const files = await run(<A />);
    expectFileToMatchSnapshot(files, "src/components/A.tsx");
    expectFileToMatchSnapshot(files, "src/App.tsx");
  });

  test("should only create one component if renders same component multiple times", async () => {
    const A = () => <div>Hello</div>;
    const files = await run([<A key="1" />, <A key="2" />]);
    expectFileToMatchSnapshot(files, "src/components/A.tsx");
    expectFileToMatchSnapshot(files, "src/App.tsx");
  });

  test("should only create one component for memo(forwardRef(function))", async () => {
    const A = memo(forwardRef(() => <div>Hello</div>));
    const files = await run(<A />);
    expectFileToMatchSnapshot(files, "src/components/Component2.tsx");
    expectFileToMatchSnapshot(files, "src/App.tsx");
  });

  test("should not create a component when returning null", async () => {
    const A = () => null;
    const files = await run(
      <div>
        <A />
      </div>
    );
    expectFileToMatchSnapshot(files, "src/App.tsx");
  });

  test("should create component when one instance returns null and another returns jsx", async () => {
    const A = ({ enabled }: { enabled: boolean }) =>
      enabled ? <div>Hello</div> : null;
    const files = await run([
      <A key="1" enabled={true} />,
      <A key="2" enabled={false} />,
    ]);
    expectFileToMatchSnapshot(files, "src/App.tsx");
    expectFileToMatchSnapshot(files, "src/components/A.tsx");
  });

  test("should create nested components", async () => {
    const A = () => <div>Hello</div>;
    const B = () => (
      <div>
        <A />
      </div>
    );
    const files = await run(<B />);
    expectFileToMatchSnapshot(files, "src/components/A.tsx");
    expectFileToMatchSnapshot(files, "src/components/B.tsx");
    expectFileToMatchSnapshot(files, "src/App.tsx");
  });

  test("should support inline functions", async () => {
    const A = () => (
      <>
        {[1, 2, 3].map((x) => (
          <div key={x}>{x}</div>
        ))}
        {(() => (
          <div>Hello</div>
        ))()}
      </>
    );
    const files = await run(<A />);
    expectFileToMatchSnapshot(files, "src/components/A.tsx");
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
      const A = (_: any) => <div />;
      const files = await run(
        <A
          enabled
          string="text"
          number={-1}
          array={[1, 2, 3]}
          object={{ a: 1, b: 2 }}
        />
      );
      expectFileToMatchSnapshot(files, "src/components/A.tsx");
      expectFileToMatchSnapshot(files, "src/App.tsx");
    });

    test("should recreate children that are react elements", async () => {
      const A = ({ children }: { children: ReactNode }) => children;
      const B = ({ children }: { children: ReactNode }) => children;
      const files = await run(
        <A>
          <B>
            <div>Hello</div>
          </B>
        </A>
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
      }
    );

    test("should convert tabIndex to number", async () => {
      const files = await run(<div tabIndex={"1" as any} />);
      expectFileToMatchSnapshot(files, "src/App.tsx");
    });
  });

  describe("naming", () => {
    test("should support multiple components with same name", async () => {
      const A = () => <div>Hello</div>;
      A.displayName = "X";
      const B = () => <div>Yellow</div>;
      B.displayName = "X";

      const files = await run([<A key="a" />, <B key="b" />]);
      expectFileToMatchSnapshot(files, "src/components/X1.tsx");
      expectFileToMatchSnapshot(files, "src/components/X2.tsx");
      expectFileToMatchSnapshot(files, "src/App.tsx");
    });

    test.todo("should rewrite component", () => {});
    test.todo("should rewrite component bottoms up", () => {});
  });
});
