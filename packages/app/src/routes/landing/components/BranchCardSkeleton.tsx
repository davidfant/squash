export const BranchCardSkeleton = ({ index }: { index: number }) => (
  <div
    className="aspect-[4/3] w-full relative rounded-xl shadow-sm animate-pulse"
    style={{
      backgroundImage: `url(/preview/abstract/${index % 4}.jpg)`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    }}
  />
);
