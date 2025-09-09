declare global {
  interface Window {
    __squash?: { reactFiber: () => SnapshotReactFiberMetadata | null };
  }
}

export {};
