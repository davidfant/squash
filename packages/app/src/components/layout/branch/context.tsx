import { api, useMutation, useQuery } from "@/hooks/api";
import { keepPreviousData } from "@tanstack/react-query";
import { usePageInView } from "framer-motion";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { BranchLayoutSkeleton } from "./skeleton";
import type { Branch } from "./types";

export type ScreenSize = "desktop" | "tablet" | "mobile";
export type Tab = "preview" | "code";

export interface BranchContextValue {
  branch: Branch;
  screenSize: ScreenSize;
  setScreenSize(size: ScreenSize): void;
  toggleScreenSize(): void;

  preview: {
    url: string | null;
    sha: string | null;
    setSha(sha: string): void;
    initialPath: string;
    currentPath: string;
    setInitialPath(path: string): void;
    setCurrentPath(path: string): void;
    refreshKey: number;
    refresh(): void;
  };

  restoreVersion(messageId: string): Promise<void>;
  refetch(): Promise<unknown>;
}

const BranchContext = createContext<BranchContextValue>({
  branch: null as any,
  screenSize: "desktop",
  setScreenSize: () => {},
  toggleScreenSize: () => {},
  preview: {
    url: null,
    sha: null,
    setSha: () => {},
    initialPath: "/",
    currentPath: "/",
    setInitialPath: () => {},
    setCurrentPath: () => {},
    refreshKey: 0,
    refresh: () => {},
  },
  restoreVersion: () => Promise.resolve(),
  refetch: () => Promise.resolve(),
});

export const getNextScreenSize = (current: ScreenSize): ScreenSize => {
  const order = ["desktop", "tablet", "mobile"] as const;
  return order[(order.indexOf(current) + 1) % order.length]!;
};

export const BranchContextProvider = ({
  branchId,
  children,
}: {
  branchId: string;
  children: ReactNode;
}) => {
  const branch = useQuery(api.branches[":branchId"].$get, {
    params: { branchId },
  });
  const [screenSize, setScreenSize] = useState<ScreenSize>("desktop");
  const [initialPath, setInitialPath] = useState("/");
  const [currentPath, setCurrentPath] = useState("/");
  const [sha, setSha] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const isVisible = usePageInView();
  const previewUrl =
    useQuery(api.branches[":branchId"].preview.$get, {
      params: { branchId },
      refetchInterval: isVisible ? 10_000 : false,
      refetchOnWindowFocus: true,
      ...({ placeholderData: keepPreviousData } as any),
    }).data?.url ?? null;

  const upstreamSha = useQuery(api.branches[":branchId"].preview.version.$get, {
    params: { branchId },
  });
  useEffect(() => {
    if (upstreamSha.data?.sha) {
      setSha(upstreamSha.data.sha);
    }
  }, [upstreamSha.data?.sha]);

  const restoreVersion = useMutation(
    api.branches[":branchId"].preview.version.$put
  );

  const toggleScreenSize = () => setScreenSize(getNextScreenSize(screenSize));

  if (!branch.data) return <BranchLayoutSkeleton />;
  return (
    <BranchContext.Provider
      value={{
        branch: branch.data,
        screenSize,
        setScreenSize,
        toggleScreenSize,
        preview: {
          url: previewUrl,
          sha,
          setSha,
          initialPath,
          currentPath,
          setInitialPath,
          setCurrentPath,
          refreshKey,
          refresh: () => setRefreshKey(refreshKey + 1),
        },
        restoreVersion: async (messageId) => {
          await restoreVersion.mutateAsync({
            param: { branchId },
            json: { messageId },
          });
          await upstreamSha.refetch();
        },
        refetch: branch.refetch,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
};

export const useBranchContext = () => useContext(BranchContext);
