import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api, useMutation, useQuery, type QueryOutput } from "@/hooks/api";
import { Check, ChevronDown } from "lucide-react";
import { useMemo } from "react";
import { useRepos } from "../hooks/useRepos";
import { BranchCard } from "./BranchCard";
import { BranchCardSkeleton } from "./BranchCardSkeleton";

type RepoBranchesResult = QueryOutput<
  (typeof api.repos)[":repoId"]["branches"]["$get"]
>;

type BranchSummary = RepoBranchesResult extends Array<infer Item>
  ? Item
  : never;

export function RecentBranchesGrid() {
  const repos = useRepos();

  const repoIds = useMemo(
    () => (repos.all ?? []).map((repo) => repo.id),
    [repos.all]
  );

  const allBranches = useQuery(api.repos.branches.$get, {
    enabled: !repos.currentId,
    params: {},
  });
  const currentBranches = useQuery(api.repos[":repoId"].branches.$get, {
    enabled: !!repos.currentId,
    params: { repoId: repos.currentId },
  });
  const branches = repos.currentId ? currentBranches : allBranches;

  const deleteBranch = useMutation(api.repos.branches[":branchId"].$delete, {
    onSuccess: () => {
      allBranches.refetch();
      currentBranches.refetch();
    },
  });

  if (branches.data?.length === 0) return null;
  return (
    <section className="space-y-6">
      <div className="flex gap-3 items-center justify-between">
        <div>
          <h2>Recent Prototypes</h2>
          {/* <p className="text-sm text-muted-foreground">
                Explore what your team is building across every repository.
              </p> */}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost">
              {!repos.current ? "All bases" : repos.current.name}
              <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => repos.setCurrent(null)}>
              All bases
              {!repos.current && <Check className="ml-auto size-4" />}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {repos.all?.map((repo) => (
              <DropdownMenuItem
                key={repo.id}
                onClick={() => repos.setCurrent(repo.id)}
              >
                {repo.name}
                {repo.id === repos.current?.id && (
                  <Check className="ml-auto size-4" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
        {branches.isPending
          ? Array.from({ length: 6 }).map((_, index) => (
              <BranchCardSkeleton key={index} index={index} />
            ))
          : branches.data?.map((branch, index) => (
              <BranchCard
                key={branch.id}
                branch={branch}
                index={index}
                onDelete={() =>
                  deleteBranch.mutate({ param: { branchId: branch.id } })
                }
              />
            ))}
      </div>
    </section>
  );
}
