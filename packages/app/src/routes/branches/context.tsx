import { api, useMutation, useQuery } from "@/hooks/api";
import { keepPreviousData } from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { BranchLayoutSkeleton } from "./BranchLayoutSkeleton";
import type { Branch } from "./types";

export type ScreenSize = "desktop" | "tablet" | "mobile";

export interface BranchContextValue {
  branch: Branch;
  screenSize: ScreenSize;
  setScreenSize(size: ScreenSize): void;
  toggleScreenSize(): void;

  previewUrl: string | null;
  previewSha: string | null;
  setPreviewSha(sha: string): void;
  previewPath: string;
  setPreviewPath(path: string): void;
  restoreVersion(messageId: string): Promise<void>;
  refetch(): Promise<unknown>;
}

const BranchContext = createContext<BranchContextValue>({
  branch: null as any,
  screenSize: "desktop",
  setScreenSize: () => {},
  toggleScreenSize: () => {},
  previewUrl: null,
  previewSha: null,
  previewPath: "",
  setPreviewSha: () => {},
  setPreviewPath: () => {},
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
  const [previewPath, setPreviewPath] = useState("");
  const [previewSha, setPreviewSha] = useState<string | null>(null);

  const previewUrl =
    useQuery(api.branches[":branchId"].preview.$get, {
      params: { branchId },
      refetchInterval: 60_000,
      ...({ placeholderData: keepPreviousData } as any),
    }).data?.url ?? null;

  const upstreamSha = useQuery(
    api.branches[":branchId"].preview.version.$get,
    {
      params: { branchId },
    }
  );
  useEffect(() => {
    if (upstreamSha.data?.sha) {
      setPreviewSha(upstreamSha.data.sha);
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
        previewPath,
        previewUrl,
        previewSha,
        setPreviewSha,
        setPreviewPath,
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
