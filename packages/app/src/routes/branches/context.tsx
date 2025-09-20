import { api, useQuery } from "@/hooks/api";
import { keepPreviousData } from "@tanstack/react-query";
import { createContext, useContext, useState, type ReactNode } from "react";
import { BranchLayoutSkeleton } from "./BranchLayoutSkeleton";
import type { Branch } from "./types";

export type ScreenSize = "desktop" | "tablet" | "mobile";

export interface BranchContextValue {
  branch: Branch;
  screenSize: ScreenSize;
  setScreenSize(size: ScreenSize): void;
  toggleScreenSize(): void;

  preview: { url: string; sha: string } | null;
  setPreview(sha: string): void;
  previewPath: string;
  setPreviewPath(path: string): void;
}

const BranchContext = createContext<BranchContextValue>({
  branch: null as any,
  screenSize: "desktop",
  setScreenSize: () => {},
  toggleScreenSize: () => {},
  preview: null,
  previewPath: "",
  setPreview: () => {},
  setPreviewPath: () => {},
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
  const branch = useQuery(api.repos.branches[":branchId"].$get, {
    params: { branchId },
  });
  const [screenSize, setScreenSize] = useState<ScreenSize>("desktop");
  const [previewPath, setPreviewPath] = useState("");

  const [currentSha, setCurrentSha] = useState<string>();
  const preview = useQuery(
    ({ param }) =>
      api.repos.branches[":branchId"].preview.$post({
        param,
        json: { sha: currentSha },
      }),
    {
      params: { branchId, sha: currentSha },
      ...({ placeholderData: keepPreviousData } as any),
    }
  );

  const toggleScreenSize = () => setScreenSize(getNextScreenSize(screenSize));

  const [toggle, setToggle] = useState(false);
  // useEffect(() => {
  //   setInterval(() => {
  //     setToggle((prev) => !prev);
  //   }, 1000);
  // }, []);

  if (!branch.data || toggle) return <BranchLayoutSkeleton />;
  return (
    <BranchContext.Provider
      value={{
        branch: branch.data,
        screenSize,
        setScreenSize,
        toggleScreenSize,
        previewPath,
        preview: preview.data ?? null,
        setPreview: setCurrentSha,
        setPreviewPath,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
};

export const useBranchContext = () => useContext(BranchContext);
