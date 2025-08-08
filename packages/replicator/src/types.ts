export interface Context {
  tagsToMoveToHead: string[];
  urlsToDownload: Set<string>;
  bodyAttributes: Record<string, unknown>;
}

export interface Capture {
  pages: Array<{
    css: string;
    js: string;
    html: { head: string; body: string };
    url: string;
  }>;
}
