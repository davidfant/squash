import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const FeatureCardSkeleton = () => (
  <Card className="p-1 shadow-none gap-1 group border-muted transition-colors hover:border-border">
    <Skeleton className="relative aspect-[3/2] rounded-lg overflow-hidden border-b border-b-muted" />
    <div className="h-10 px-3 flex items-center gap-2">
      {/* <Skeleton className="size-6 rounded-full" /> */}
    </div>
  </Card>
);
