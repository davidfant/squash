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

describe("replicate > reactFiber", () => {
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
    // props like children
  });

  test.todo(
    "should throw an error if same data-squash-parent-id nodes existing in different parents",
    () => {}
  );

  describe("naming", () => {
    test.only("should support multiple components with same name", async () => {
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
