export interface Context {
  tagsToMoveToHead: string[];
  urlsToDownload: Set<string>;
  bodyAttributes: Record<string, unknown>;
}

export interface Capture {
  pages: Array<{
    url: string;
    js: string;
    css: string;
    html: { head: string; body: string };
  }>;
}
