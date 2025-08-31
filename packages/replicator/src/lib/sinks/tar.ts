import { createTarGzip } from "nanotar";
import type { Asset, FileSink } from "./base";

export class TarSink implements FileSink<Uint8Array> {
  private assets: Asset[] = [];
  async writeText(path: string, text: string) {
    this.assets.push({ path, bytes: new TextEncoder().encode(text) });
  }
  async writeBytes(path: string, bytes: Uint8Array) {
    this.assets.push({ path, bytes });
  }
  async list() {
    return [...new Set(this.assets.map((a) => a.path))];
  }
  async readText(path: string) {
    const found = this.assets.find((a) => a.path === path);
    if (!found) {
      throw new Error(`File ${path} not found`);
    }
    return new TextDecoder().decode(found.bytes);
  }
  async finalize() {
    return createTarGzip(
      this.assets.map((a) => ({ name: a.path, data: a.bytes })),
      { attrs: { user: "js", group: "js" } }
    );
  }
}
