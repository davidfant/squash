export namespace Metadata {
  export namespace ReactFiber {
    export type NodeId = `N${number}`;
    export type ComponentId = `C${number}`;
    export type CodeId = `F${number}`;

    export namespace Component {
      export enum Tag {
        FunctionComponent = 0, // Function component
        ClassComponent = 1, // Class component
        IndeterminateComponent = 2, // Before React knows FC vs Class
        HostRoot = 3, // Root of the React tree
        HostPortal = 4, // <Portal>
        DOMElement = 5, // Host component (<div>, <span>, etc.)
        HostText = 6, // Text node
        Fragment = 7, // <>, </> fragment
        StrictMode = 8, // <React.StrictMode>
        ContextConsumer = 9, // useContext consumer
        ContextProvider = 10, // <Context.Provider>
        ForwardRef = 11, // React.forwardRef
        Profiler = 12, // <Profiler>
        SuspenseComponent = 13, // <Suspense>
        MemoComponent = 14, // React.memo wrapper
        SimpleMemoComponent = 15, // Optimized React.memo
        LazyComponent = 16, // React.lazy
        IncompleteClassComponent = 17, // During mount before class finishes
        DehydratedFragment = 18, // For hydration (SSR)
        SuspenseListComponent = 19, // <SuspenseList>
        ScopeComponent = 20, // (experimental) <Scope>
        OffscreenComponent = 21, // <Offscreen> / hidden trees
        LegacyHiddenComponent = 22, // Old hidden API
        CacheComponent = 23, // Cache for resources (React 18+)
        TracingMarkerComponent = 24, // (experimental) tracing markers
        HostHoistableRoot = 25, // Root for hoistables (rarely seen)
        HostHoistable = 26, // <link>, <meta>, <style>, etc.
        HostSingleton = 27, // <body>, <html>, <head>
      }

      export interface HostRoot {
        tag: Tag.HostRoot;
      }

      interface WithCode<T extends Tag> {
        tag: T;
        name: string | undefined;
        codeId: CodeId;
      }

      export type Function = WithCode<Tag.FunctionComponent>;
      export type ForwardRef = WithCode<Tag.ForwardRef>;
      export type Memo = WithCode<Tag.MemoComponent>;
      export type SimpleMemo = WithCode<Tag.SimpleMemoComponent>;

      export interface Text {
        tag: Tag.HostText;
      }

      export interface DOMElement {
        tag: Tag.DOMElement;
      }

      export type Any =
        | HostRoot
        | Function
        | ForwardRef
        | Memo
        | SimpleMemo
        | Text
        | DOMElement;
    }

    export interface Node {
      parentId: NodeId | null;
      componentId: ComponentId;
      props: Record<string, unknown> | string | null;
    }

    export namespace Element {
      export interface Code {
        $$typeof: "react.code";
        codeId: CodeId | null;
        props: Record<string, unknown>;
      }

      export interface Tag {
        $$typeof: "react.tag";
        tagName: string;
        props: Record<string, unknown>;
      }

      export interface Fragment {
        $$typeof: "react.fragment";
        children: Array<Any | null>;
      }

      export type Any = Code | Tag | Fragment;
    }
  }

  export interface ReactFiber {
    type: "react-fiber";
    code: Record<ReactFiber.CodeId, string>;
    components: Record<ReactFiber.ComponentId, ReactFiber.Component.Any>;
    nodes: Record<ReactFiber.NodeId, ReactFiber.Node>;
  }
}

export interface Snapshot {
  page: { url: string; title: string; html: string };
  metadata: Metadata.ReactFiber | null;
}

export interface Session {
  snapshots: Snapshot[];
}

export interface RefImport {
  module: string;
  name: string;
  default?: boolean;
}
