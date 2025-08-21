export interface Context {
  tagsToMoveToHead: string[];
  urlsToDownload: Set<string>;
  bodyAttributes: Record<string, unknown>;
}

export interface Snapshot {
  page: {
    url: string;
    title: string;
    html: string;
  };
}

export interface Session {
  snapshots: Snapshot[];
}
