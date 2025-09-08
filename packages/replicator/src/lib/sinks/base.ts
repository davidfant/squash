export interface FileSink<T = void> {
  writeText(path: string, text: string): Promise<void>;
  writeBytes(path: string, bytes: Buffer): Promise<void>;
  remove(path: string): Promise<void>;
  list(): Promise<string[]>;
  readText(path: string): Promise<string>;
  finalize(): Promise<T>;
}

export interface Asset {
  path: string;
  bytes: Uint8Array;
}
