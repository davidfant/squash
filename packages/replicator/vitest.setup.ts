// vitest.setup.ts
import { vi } from "vitest";

vi.mock("@resvg/resvg-wasm", () => {
  class FakeResvg {
    render = () => ({ asPng: () => new Uint8Array() });
  }
  return { Resvg: FakeResvg, initWasm: () => {} };
});
