import type { Asset, FileSink } from "@/lib/sinks/base";
import { JSDOM } from "jsdom";
import { replicate } from "..";

class TestSink implements FileSink<Asset[]> {
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

const test = async (html: string) => {
  const sink = new TestSink();
  await replicate(
    { page: { url: "http://localhost", title: "Test", html } },
    sink
  );
  return sink.finalize();
};

const normalize = (s?: string) => (s ?? "").replace(/\s+/g, " ").trim();

function expectSinkFile(assets: Asset[], path: string) {
  const asset = assets.find((a) => a.path === path);
  expect(asset).toBeDefined();
  return new TextDecoder().decode(asset!.bytes);
}

describe("replicate", () => {
  describe("attributes", () => {
    it("should copy html attributes", async () => {
      const files = await test(`<html lang="en" class="dark"></html>`);
      const index = expectSinkFile(files, "index.html");
      expect(index).toContain(`<html lang="en" class="dark">`);
    });

    it("should copy body attributes", async () => {
      const files = await test(
        `<html lang="en" class="dark">
          <body class="bg-white">
          </body>
        </html>`
      );
      const index = expectSinkFile(files, "index.html");
      expect(index).toContain(`<body class="bg-white">`);
    });
  });

  describe("links, scripts and styles", () => {
    it("should move links, scripts and styles in body to head", async () => {
      const files = await test(
        `<html>
          <body>
            <script src="/script.js"></script>
            <link rel="stylesheet" href="/style.css">
            <style>* { color: red; }</style>
          </body>
        </html>`
      );

      const index = expectSinkFile(files, "index.html");
      const { window } = new JSDOM(index);
      const head = window.document.querySelector("head");
      expect(head).toBeDefined();
      expect(normalize(head?.innerHTML)).toContain(
        normalize(`<script src="/script.js"></script>`)
      );
      expect(normalize(head?.innerHTML)).toContain(
        normalize(`<link rel="stylesheet" href="/style.css">`)
      );
      expect(normalize(head?.innerHTML)).toContain(
        normalize(`<style> * { color: red; } </style>`)
      );
    });

    it("should remove json and json+ld scripts", async () => {
      const files = await test(
        `<html>
          <head>
            <script type="application/json">{"foo": "bar"}</script>
          </head>
          <body>
            <script type="application/ld+json">{"foo": "bar"}</script>
          </body>
        </html>`
      );
      const index = expectSinkFile(files, "index.html");
      const { window } = new JSDOM(index);
      const head = window.document.querySelector("head");
      expect(head).toBeDefined();
      expect(head?.innerHTML).not.toContain("application/json");
      expect(head?.innerHTML).not.toContain("application/ld+json");
    });

    xit("should download scripts and styles", async () => {});
  });
});
