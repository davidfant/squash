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
  });

  describe("diff", () => {
    test("attribute is missing", () => {
      const diff = diff(
        `<button disabled>Hello</button>`,
        <button>Hello</button>
      );
      expect(diff).toBe(
        `
- Expected
+ Received

  Object {
    "attrs": Object {},
    "children": Array [
      Object {
-       "attrs": Object {
-         "disabled": "",
-       },
+       "attrs": Object {},
        "children": Array [
          "Hello",
        ],
        "tag": "button",
      },
    ],
    "tag": "#document-fragment",
  }  
      `.trim()
      );
    });

    test("tag is different", () => {
      expect(diff(`<button>Hello</button>`, <div>Hello</div>)).toBe(
        `
- Expected
+ Received

  Object {
    "attrs": Object {},
    "children": Array [
      Object {
        "attrs": Object {},
        "children": Array [
          "Hello",
        ],
-       "tag": "button",
+       "tag": "div",
      },
    ],
    "tag": "#document-fragment",
  }
        `.trim()
      );
    });

    test("child is missing", () => {
      const d = diff(
        `<div>Hello</div>`,
        <div>
          <div>Hello</div>
        </div>
      );
      expect(d).toBe(
        `
- Expected
+ Received

  Object {
    "attrs": Object {},
    "children": Array [
      Object {
        "attrs": Object {},
        "children": Array [
+         Object {
+           "attrs": Object {},
+           "children": Array [
              "Hello",
+           ],
+           "tag": "div",
+         },
        ],
        "tag": "div",
      },
    ],
    "tag": "#document-fragment",
  }
      `.trim()
      );
    });
  });
});
