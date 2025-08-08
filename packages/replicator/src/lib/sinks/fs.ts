import fs from "fs/promises";
import path from "path";
import { type FileSink } from "./base";

export class FileSystemSink implements FileSink {
  constructor(private readonly dir: string) {}

  async writeText(path: string, text: string) {
    this.writeBytes(path, Buffer.from(text));
  }
  async writeBytes(filePath: string, bytes: Buffer) {
    const fullFilePath = path.join(this.dir, filePath);
    await fs.mkdir(path.dirname(fullFilePath), { recursive: true });
    await fs.writeFile(fullFilePath, bytes);
  }
  async finalize() {}
}
