import { load } from "cheerio";
import { aliasSVGPaths } from "./aliasSVGPaths";

async function run(svgString: string) {
  const $ = load(svgString);
  const dPathMapping = await aliasSVGPaths($, async () => ({
    name: "test",
    description: "test",
  }));
  return { $, dPathMapping };
}

describe("aliasSVGPaths", () => {
  test("should alias paths", async () => {
    const res = await run(`
<svg>
  <path d="replace me" />
  <path d="replace me too" />
</svg>
    `);

    const placeholders = {
      path1: "[[SVG:0|PATH:0|NAME:test|DESCRIPTION:test]]",
      path2: "[[SVG:0|PATH:1|NAME:test|DESCRIPTION:test]]",
    };

    expect(res.dPathMapping.get("replace me")).toBe(placeholders.path1);
    expect(res.dPathMapping.get("replace me too")).toBe(placeholders.path2);
    expect(res.$("body").html()?.trim()).toBe(
      `
<svg>
  <path d="${placeholders.path1}"></path>
  <path d="${placeholders.path2}"></path>
</svg>
    `.trim()
    );
  });

  test("should use same placeholder if SVG attributes are different", async () => {
    const res = await run(` 
      <body>
        <svg>
          <path d="replace me" />
        </svg>
        <svg class="something">
          <path d="replace me" />
        </svg>
      </body>
    `);

    expect(res.dPathMapping.get("replace me")).toBe(
      `[[SVG:0|PATH:0|NAME:test|DESCRIPTION:test]]`
    );
  });

  test("should use same placeholder if whitespace is different", async () => {
    const res = await run(` 
      <body>
        <svg>
          <path     d="replace me"   ></path>
        </svg>
        <svg><path d="replace me"/></svg>
      </body>
    `);

    expect(res.dPathMapping.get("replace me")).toBe(
      `[[SVG:0|PATH:0|NAME:test|DESCRIPTION:test]]`
    );
  });
});
