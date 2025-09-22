import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const BranchCardSkeleton = () => (
  <Card className="pt-0 overflow-hidden">
    <div className="aspect-video w-full bg-muted" />
    <CardContent className="flex items-center gap-3">
      <Skeleton className="size-8 rounded-full" />
      <div className="min-w-0 space-y-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </CardContent>
  </Card>
);
