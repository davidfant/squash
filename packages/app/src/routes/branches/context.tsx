import { api, useQuery } from "@/hooks/api";
import { createContext, useContext, useState, type ReactNode } from "react";
import type { Branch } from "./types";

export type ScreenSize = "desktop" | "tablet" | "mobile";

export interface BranchContextValue {
  branch: Branch;
  screenSize: ScreenSize;
  setScreenSize(size: ScreenSize): void;
  toggleScreenSize(): void;

  previewPath: string;
  setPreviewPath(path: string): void;
}

const BranchContext = createContext<BranchContextValue>({
  branch: null as any,
  screenSize: "desktop",
  setScreenSize: () => {},
  toggleScreenSize: () => {},
  previewPath: "",
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

  const toggleScreenSize = () => setScreenSize(getNextScreenSize(screenSize));

  if (!branch.data) return null;
  return (
    <BranchContext.Provider
      value={{
        branch: branch.data,
        screenSize,
        setScreenSize,
        toggleScreenSize,
        previewPath,
        setPreviewPath,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
};

export const useBranchContext = () => useContext(BranchContext);
