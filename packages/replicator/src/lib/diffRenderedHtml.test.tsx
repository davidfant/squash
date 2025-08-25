import { diffRenderedHtml } from "./diffRenderedHtml";

describe("diffRenderedHtml", () => {
  describe("null", () => {
    test("identical", () => {
      expect(diffRenderedHtml("<div>Hello</div>", <div>Hello</div>)).toBeNull();
    });

    test("attribute order is different", () => {
      expect(
        diffRenderedHtml(
          "<div class='a' id='b'>Hello</div>",
          <div id="b" className="a">
            Hello
          </div>
        )
      ).toBeNull();
    });

    test("attribute is empty string vs true", () => {
      expect(
        diffRenderedHtml(
          `<button disabled="">Hello</button>`,
          <button disabled>Hello</button>
        )
      ).toBeNull();
    });
    test("whitespace is different", () => {
      expect(
        diffRenderedHtml(
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
      const diff = diffRenderedHtml(
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
      expect(diffRenderedHtml(`<button>Hello</button>`, <div>Hello</div>)).toBe(
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
      const diff = diffRenderedHtml(
        `<div>Hello</div>`,
        <div>
          <div>Hello</div>
        </div>
      );
      expect(diff).toBe(
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
