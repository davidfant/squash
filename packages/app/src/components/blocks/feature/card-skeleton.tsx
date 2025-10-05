import { Skeleton } from "@/components/ui/skeleton";

export const FeatureCardSkeleton = ({ index }: { index: number }) => (
  // <div
  //   className="aspect-[4/3] w-full relative rounded-xl shadow-sm animate-pulse"
  //   style={{
  //     backgroundImage: `url(/preview/abstract/${index % 4}.jpg)`,
  //     backgroundSize: "cover",
  //     backgroundPosition: "center",
  //   }}
  // />
  <Skeleton className="aspect-[5/4] rounded-xl animate-pulse" />
);
