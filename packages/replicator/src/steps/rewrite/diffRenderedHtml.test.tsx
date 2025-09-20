import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { diffRenderedHtml } from "./diffRenderedHtml";

const diff = (html: string, node: ReactNode) =>
  diffRenderedHtml(html, renderToStaticMarkup(node));

describe("diffRenderedHtml", () => {
  describe("null", async () => {
    test("identical", async () => {
      expect(await diff("<div>Hello</div>", <div>Hello</div>)).toBeUndefined();
    });

    test("attribute order is different", async () => {
      expect(
        await diff(
          "<div class='a' id='b'>Hello</div>",
          <div id="b" className="a">
            Hello
          </div>
        )
      ).toBeUndefined();
    });

    test("attribute is empty string vs true", async () => {
      expect(
        await diff(
          `<button disabled="">Hello</button>`,
          <button disabled>Hello</button>
        )
      ).toBeUndefined();
    });

    test("whitespace is different", async () => {
      expect(
        await diff(
          `
            <div>
              Hello
            </div>
          `,
          <div>Hello</div>
        )
      ).toBeUndefined();
    });

    describe("style invariants", async () => {
      test("order", async () => {
        expect(
          await diff(
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
        ).toBeUndefined();
      });

      test("0px <=> 0", async () => {
        expect(
          await diff(
            `<div style="width: 0px; clip: rect(0px, 0px, 0px, 0px)" />`,
            <div style={{ width: 0, clip: "rect(0 0 0 0)" }} />
          )
        ).toBeUndefined();
      });

      test("overflow-wrap <=> word-wrap", async () => {
        expect(
          await diff(
            `<div style="overflow-wrap: break-word" />`,
            <div style={{ wordWrap: "break-word" }} />
          )
        ).toBeUndefined();
      });

      test("untrimmed", async () => {
        expect(
          await diff(
            `<div style="--width: 0px  " />`,
            <div style={{ ["--width" as any]: " 0px" }} />
          )
        ).toBeUndefined();
      });

      test("empty", async () => {
        expect(await diff(`<div />`, <div style={{}} />)).toBeUndefined();
      });
    });

    describe("class invariants", async () => {
      test("order", async () => {
        expect(
          await diff(`<div class="c b a" />`, <div className="a b c" />)
        ).toBeUndefined();
      });

      test("whitespace is different", async () => {
        expect(
          await diff(`<div class="a b   c" />`, <div className="  a   b c " />)
        ).toBeUndefined();
      });
    });
  });

  describe("diff", async () => {
    test("attribute is missing", async () => {
      const d = await diff(
        `<button disabled>Hello</button>`,
        <button>Hello</button>
      );
      expect(d).toMatchSnapshot();
    });

    test("tag is different", async () => {
      expect(
        await diff(`<button>Hello</button>`, <div>Hello</div>)
      ).toMatchSnapshot();
    });

    test("child is missing", async () => {
      const d = await diff(
        `<div>Hello</div>`,
        <div>
          <div>Hello</div>
        </div>
      );
      expect(d).toMatchSnapshot();
    });
  });
});
