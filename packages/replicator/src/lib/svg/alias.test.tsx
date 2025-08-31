import { reactFiber } from "@/metadata/reactFiber";
import { load } from "cheerio";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { aliasSVGPaths } from "./alias";

describe("aliasSVGPaths", () => {
  let root: Root;
  beforeEach(() => {
    document.body.innerHTML = "";
    root = createRoot(document.body);
  });
  afterEach(() => root.unmount());

  async function run(app: ReactNode) {
    root.render(app);
    await new Promise<void>((r) => {
      const check = () =>
        document.body.innerHTML ? r() : requestAnimationFrame(check);
      check();
    });

    const $ = load(document.body.innerHTML);
    const metadata = await reactFiber();

    const aliased = await aliasSVGPaths($, metadata, async () => ({
      name: "test",
      description: "test",
    }));
    return { $, ...aliased };
  }

  test("should alias paths", async () => {
    const res = await run(
      <svg>
        <path d="replace me" />
        <path d="replace me too" />
      </svg>
    );

    const placeholders = {
      path1: "[[SVG:0|PATH:0|NAME:test|DESCRIPTION:test]]",
      path2: "[[SVG:0|PATH:1|NAME:test|DESCRIPTION:test]]",
    };

    expect(res.dPathMapping.get("replace me")).toBe(placeholders.path1);
    expect(res.dPathMapping.get("replace me too")).toBe(placeholders.path2);
    expect(res.$("body").html()?.trim()).toMatchSnapshot();
  });

  test("should use same placeholder if SVG attributes are different", async () => {
    const res = await run(
      <>
        <svg>
          <path d="replace me" />
        </svg>
        <svg className="something">
          <path d="replace me" />
        </svg>
      </>
    );

    expect(res.dPathMapping.get("replace me")).toBe(
      `[[SVG:0|PATH:0|NAME:test|DESCRIPTION:test]]`
    );
  });

  test("should use same placeholder if whitespace is different", async () => {
    const res = await run(
      <>
        <svg>
          <path d="replace me"></path>
        </svg>
        <svg>
          <path d="replace me" />
        </svg>
      </>
    );

    expect(res.dPathMapping.get("replace me")).toBe(
      `[[SVG:0|PATH:0|NAME:test|DESCRIPTION:test]]`
    );
  });

  describe("metadata", () => {
    test("should replace SVG paths in metadata", async () => {
      const Child = ({ path }: { path: string }) => (
        <svg>
          <path d="replace me 1" />
          <path d={path} />
        </svg>
      );
      const Parent = () => <Child path="replace me 2" />;
      const res = await run(<Parent />);

      expect(res.metadata?.code.F1).not.toContain("replace me 1");
      expect(res.metadata?.code.F1).toContain(
        `[[SVG:0|PATH:0|NAME:test|DESCRIPTION:test]]`
      );
      expect(res.metadata?.code.F0).not.toContain("replace me 2");
      expect(res.metadata?.code.F0).toContain(
        `[[SVG:0|PATH:1|NAME:test|DESCRIPTION:test]]`
      );
    });
  });
});
