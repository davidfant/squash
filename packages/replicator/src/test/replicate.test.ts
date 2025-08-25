import type { Asset, FileSink } from "@/lib/sinks/base";
import { load } from "cheerio";
import { replicate } from "..";

export class TestSink implements FileSink<Asset[]> {
  private assets: Asset[] = [];
  async writeText(path: string, text: string) {
    this.assets.push({ path, bytes: new TextEncoder().encode(text) });
  }
  async writeBytes(path: string, bytes: Uint8Array) {
    this.assets.push({ path, bytes });
  }
  async finalize() {
    return this.assets;
  }
}

const run = async (html: string) => {
  const sink = new TestSink();
  await replicate(
    { page: { url: "http://localhost", title: "Test", html }, metadata: null },
    sink
  );
  return sink.finalize();
};

const normalize = (s?: string | null) => (s ?? "").replace(/\s+/g, " ").trim();

export function expectFile(assets: Asset[], path: string) {
  const asset = assets.find((a) => a.path === path);
  expect(asset).toBeDefined();
  return new TextDecoder().decode(asset!.bytes);
}

describe("replicate", () => {
  describe("attributes", () => {
    test("should copy html attributes", async () => {
      const files = await run(`<html lang="en" class="dark"></html>`);
      const index = expectFile(files, "index.html");
      expect(index).toContain(`<html lang="en" class="dark">`);
    });

    test("should copy body attributes", async () => {
      const files = await run(
        `<html lang="en" class="dark">
          <body class="bg-white">
          </body>
        </html>`
      );
      const index = expectFile(files, "index.html");
      expect(index).toContain(`<body class="bg-white">`);
    });
  });

  describe("links, scripts and styles", () => {
    test("should move links and styles in body to head", async () => {
      const files = await run(
        `<html>
          <body>
            <link rel="stylesheet" href="/style.css">
            <style>* { color: red; }</style>
          </body>
        </html>`
      );

      const index = expectFile(files, "index.html");
      const $ = load(index);
      const head = $("head");
      expect(head).toBeDefined();
      expect(normalize(head?.html())).toContain(
        normalize(`<script src="/script.js"></script>`)
      );
      expect(normalize(head?.html())).toContain(
        normalize(`<link rel="stylesheet" href="/style.css">`)
      );
      expect(normalize(head?.html())).toContain(
        normalize(`<style> * { color: red; } </style>`)
      );
    });

    // test("should remove json and json+ld scripts", async () => {
    test("should remove scripts", async () => {
      const files = await run(
        `<html>
          <head>
            <script src="/script.js"></script>
            <script type="application/json">{"foo": "bar"}</script>
          </head>
          <body>
            <script type="application/ld+json">{"foo": "bar"}</script>
          </body>
        </html>`
      );
      const index = expectFile(files, "index.html");
      const $ = load(index);
      expect($.html()).not.toContain("script");
      // expect(head?.html()).not.toContain("application/json");
      // expect(head?.html()).not.toContain("application/ld+json");
    });

    test.todo("should download styles", async () => {});
  });
});
