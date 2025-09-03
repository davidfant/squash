import fs from "fs/promises";
import path from "path";
import { type FileSink } from "./base";

export class FileSystemSink implements FileSink {
  private readonly paths = new Set<string>();
  constructor(private readonly dir: string) {}

  async writeText(path: string, text: string) {
    await this.writeBytes(path, Buffer.from(text));
  }
  async writeBytes(filePath: string, bytes: Buffer) {
    const fullFilePath = path.join(this.dir, filePath);
    await fs.mkdir(path.dirname(fullFilePath), { recursive: true });
    await fs.writeFile(fullFilePath, bytes);
    this.paths.add(filePath);
  }
  async list() {
    return Array.from(this.paths);
  }
  async readText(filePath: string) {
    return await fs.readFile(path.join(this.dir, filePath), "utf-8");
  }

  async finalize() {}
}
