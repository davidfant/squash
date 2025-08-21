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
