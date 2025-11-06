import { IframeCard } from "@/components/blocks/iframe";
import { LogoIcon } from "@/components/Logo";
import { Skeleton } from "@/components/ui/skeleton";
import { api, useQuery } from "@/hooks/api";
import { Link } from "react-router";

export function BranchDeploymentLayout({ branchId }: { branchId: string }) {
  const branch = useQuery(api.branches[":branchId"].$get, {
    params: { branchId },
  });
  branch.data?.deployment;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-2 p-2">
        {/* <Skeleton className="size-6 rounded-full" /> */}
        <Link to="/" className="flex items-center">
          <LogoIcon className="size-6 hover:opacity-80 transition-opacity" />
        </Link>
        {branch.data ? (
          <span className="font-medium text-sm">{branch.data.repo.name}</span>
        ) : (
          <Skeleton className="h-6 w-32" />
        )}
      </header>
      <div className="flex-1 p-2 pt-0">
        <IframeCard
          loading={branch.isPending}
          url={branch.data?.deployment?.url ?? null}
          fallback="This app is under development. Ask the owner to publish it!"
          className="h-full"
        />
      </div>
    </div>
  );
}
