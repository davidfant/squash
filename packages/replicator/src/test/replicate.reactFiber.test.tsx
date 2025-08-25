import { reactFiber } from "@/metadata/reactFiber";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { describe, test } from "vitest";
import { replicate } from "..";
import { expectFile, TestSink } from "./replicate.test";

const root = createRoot(document.body);

const run = async (node: ReactNode) => {
  root.render(node);
  await new Promise((r) => requestAnimationFrame(r));

  const sink = new TestSink();
  const metadata = reactFiber();
  const html = document.documentElement.innerHTML;
  console.log(html);
  const page = { url: "http://localhost", title: "Test", html };
  console.log(JSON.stringify({ page, metadata }, null, 2));
  await replicate({ page, metadata }, sink);
  return sink.finalize();
};

describe("replicate > reactFiber", () => {
  test.only("should create App.tsx", async () => {
    // const A = () => <div>Hello</div>;
    // const B = ({ children }: { children: ReactNode }) => <div>{children}</div>;
    // const files = await test([
    //   <A key="a" />,
    //   <B key="b">
    //     <A />
    //   </B>,
    // ]);
    const files = await run(<div>Hello</div>);
    const apptsx = expectFile(files, "src/App.tsx");
    expect(apptsx).toMatchSnapshot();
    console.log(apptsx);
  });

  test.todo("should create a component", () => {});
  test.todo(
    "should only create one component if renders multiple components",
    () => {}
  );
  test.todo(
    "should throw an error if same data-squash-parent-id nodes existing in different parents",
    () => {}
  );
  test.todo(
    "should only create one component for memo(forwardRef(function))",
    () => {}
  );
  test.todo("should not create a component when returning null", () => {});
  test.todo(
    "should create component when one instance returns null and another returns jsx",
    () => {}
  );

  describe("naming", () => {
    test.todo("should rewrite component", () => {});
    test.todo("should rewrite component bottoms up", () => {});
  });
});
