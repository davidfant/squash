import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { diffRenderedHtml } from "./diffRenderedHtml";

const diff = (html: string, node: ReactNode) =>
  diffRenderedHtml(html, renderToStaticMarkup(node));

describe("diffRenderedHtml", () => {
  describe("null", () => {
    test("identical", () => {
      expect(diff("<div>Hello</div>", <div>Hello</div>)).toBeNull();
    });

    test("attribute order is different", () => {
      expect(
        diff(
          "<div class='a' id='b'>Hello</div>",
          <div id="b" className="a">
            Hello
          </div>
        )
      ).toBeNull();
    });

    test("attribute is empty string vs true", () => {
      expect(
        diff(
          `<button disabled="">Hello</button>`,
          <button disabled>Hello</button>
        )
      ).toBeNull();
    });

    test("whitespace is different", () => {
      expect(
        diff(
          `
            <div>
              Hello
            </div>
          `,
          <div>Hello</div>
        )
      ).toBeNull();
    });

    describe("style invariants", () => {
      test("order", () => {
        expect(
          diff(
            `<div style="position:absolute; top:0; left:0; right:0; bottom:0" />`,
            <div
              style={{
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                position: "absolute",
              }}
            />
          )
        ).toBeNull();
      });

      test("0px <=> 0", () => {
        expect(
          diff(
            `<div style="width: 0px; clip: rect(0px, 0px, 0px, 0px)" />`,
            <div style={{ width: 0, clip: "rect(0 0 0 0)" }} />
          )
        ).toBeNull();
      });

      test("overflow-wrap <=> word-wrap", () => {
        expect(
          diff(
            `<div style="overflow-wrap: break-word" />`,
            <div style={{ wordWrap: "break-word" }} />
          )
        ).toBeNull();
      });
    });

    describe("class invariants", () => {
      test("order", () => {
        throw new Error("implement...");
      });

      test("whitespace is different", () => {
        throw new Error("implement...");
      });
    });
  });

  describe("diff", () => {
    test("attribute is missing", () => {
      const d = diff(`<button disabled>Hello</button>`, <button>Hello</button>);
      expect(d).toMatchSnapshot();
    });

    test("tag is different", () => {
      expect(
        diff(`<button>Hello</button>`, <div>Hello</div>)
      ).toMatchSnapshot();
    });

    test("child is missing", () => {
      const d = diff(
        `<div>Hello</div>`,
        <div>
          <div>Hello</div>
        </div>
      );
      expect(d).toMatchSnapshot();
    });
  });
});
