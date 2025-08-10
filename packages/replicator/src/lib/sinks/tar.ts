import type { Asset, FileSink } from "./base";

// shared/tar.ts
function padOctal(num: number, length: number) {
  const s = num.toString(8);
  return ("000000000000" + s).slice(-length - 1) + "\0"; // NUL-terminated
}
function u8(len: number) {
  return new Uint8Array(len);
}
function putStr(dst: Uint8Array, off: number, s: string) {
  for (let i = 0; i < s.length && off + i < dst.length; i++) {
    dst[off + i] = s.charCodeAt(i);
  }
}
function pad512(n: number) {
  return (512 - (n % 512)) % 512;
}

function makeTar(assets: { path: string; bytes: Uint8Array }[]): Uint8Array {
  const blocks: Uint8Array[] = [];

  for (const { path, bytes } of assets) {
    const header = u8(512);
    // name (100)
    if (path.length <= 100) {
      putStr(header, 0, path);
    } else {
      // split into prefix/name for long paths (ustar)
      const idx = path.lastIndexOf("/");
      const name = path.slice(idx + 1);
      const prefix = path.slice(0, idx);
      putStr(header, 0, name.slice(0, 100));
      putStr(header, 345, prefix.slice(0, 155));
    }
    // mode, uid, gid
    putStr(header, 100, padOctal(0o644, 7));
    putStr(header, 108, padOctal(0, 7));
    putStr(header, 116, padOctal(0, 7));
    // size, mtime
    putStr(header, 124, padOctal(bytes.length, 11));
    putStr(header, 136, padOctal(Math.floor(Date.now() / 1000), 11));
    // chksum placeholder (8 spaces)
    putStr(header, 148, "        ");
    // typeflag '0' (file)
    putStr(header, 156, "0");
    // magic ustar\0 and version 00
    putStr(header, 257, "ustar\0");
    putStr(header, 263, "00");
    // uname/gname optional

    // checksum
    let sum = 0;
    for (let i = 0; i < 512; i++) {
      sum += i >= 148 && i < 156 ? 32 : header[i]!;
    }
    putStr(header, 148, padOctal(sum, 6)); // last two bytes: NUL + space already fine

    blocks.push(header);
    blocks.push(bytes);
    const pad = pad512(bytes.length);
    if (pad) blocks.push(u8(pad));
  }

  // Two empty 512 blocks mark end of archive
  blocks.push(u8(512), u8(512));

  // concat
  const total = blocks.reduce((n, b) => n + b.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const b of blocks) {
    out.set(b, offset);
    offset += b.length;
  }
  return out;
}

async function gzipBytes(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  const ab = await new Response(stream).arrayBuffer();
  return new Uint8Array(ab);
}

export class TarSink implements FileSink<Uint8Array> {
  private assets: Asset[] = [];
  async writeText(path: string, text: string) {
    this.assets.push({ path, bytes: new TextEncoder().encode(text) });
  }
  async writeBytes(path: string, bytes: Uint8Array) {
    this.assets.push({ path, bytes });
  }
  async finalize() {
    return gzipBytes(makeTar(this.assets));
  }
}
