import { PageHeader } from "../../components/blocks/page-header";
import { Skeleton } from "../../components/ui/skeleton";
import { ReviewSidebar } from "./sidebar";

export function MyReviewPage() {
  return (
    <div className="flex h-full">
      <ReviewSidebar />
      <div className="flex-1">
        <PageHeader
          title="Review"
          breadcrumbs={[{ label: "Home", href: "/" }]}
        />
        <div className="p-4">
          <div className="gap-4 flex flex-col">
            <Skeleton className="h-24 w-full" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-32 flex-1" />
              <Skeleton className="h-32 flex-1" />
              <Skeleton className="h-32 flex-1" />
              <Skeleton className="h-32 flex-1" />
            </div>
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
