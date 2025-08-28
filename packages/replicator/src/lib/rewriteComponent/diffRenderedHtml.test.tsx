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

    test("style order is different", () => {
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
