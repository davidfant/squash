export interface Context {
  tagsToMoveToHead: string[];
  urlsToDownload: Set<string>;
  bodyAttributes: Record<string, unknown>;
}

export interface Stats {
  b64Images: { total: number; unique: number };
  svgs: { total: number; unique: number };
}
