import { createHash } from "crypto";
import path from "path";
import type { FileSink } from "../sinks/base";

export async function downloadRemoteUrl(url: URL, sink: FileSink) {
  const ext = path.extname(url.pathname) || ".bin";
  const id = createHash("sha1")
    .update(url.pathname + url.search + url.hash)
    .digest("hex")
    .slice(0, 16);
  const out = path.join("public/remote", `${id}${ext}`);
  const buf = await fetch(url).then((r) => r.arrayBuffer());
  await sink.writeBytes(out, Buffer.from(buf));
}
