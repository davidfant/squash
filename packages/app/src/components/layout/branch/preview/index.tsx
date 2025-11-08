import { Iframe } from "@/components/blocks/iframe";
import { cn } from "@/lib/utils";
import { useBranchContext } from "../context";

export function BranchPreview() {
  const { screenSize, preview } = useBranchContext();
  const getPreviewWidth = () => {
    if (screenSize === "desktop") return "w-full";
    if (screenSize === "tablet") return "w-[768px]";
    if (screenSize === "mobile") return "w-[375px]";
  };

  if (!preview.url) return null;
  return (
    <Iframe
      url={preview.url}
      key={preview.refreshKey}
      className={cn(
        "flex-1 mx-auto transition-all duration-300 z-2",
        getPreviewWidth()
      )}
      onNavigate={preview.setCurrentPath}
    />
  );
}
