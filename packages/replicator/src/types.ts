export interface Context {
  tagsToMoveToHead: string[];
  urlsToDownload: Set<string>;
  bodyAttributes: Record<string, unknown>;
}

export interface Stats {
  svgs: { total: number; unique: number };
}
