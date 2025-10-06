import { FeatureCardGrid } from "@/components/blocks/feature/grid";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api, useMutation, useQuery } from "@/hooks/api";
import { Check, ChevronDown } from "lucide-react";
import { FeatureCard } from "../../../components/blocks/feature/card";
import { useRepos } from "../hooks/useRepos";

export function RecentBranchesGrid() {
  const repos = useRepos();

  const allBranches = useQuery(api.branches.$get, {
    enabled: !repos.currentId,
    params: {},
  });
  const currentBranches = useQuery(api.repos[":repoId"].branches.$get, {
    enabled: !!repos.currentId,
    params: { repoId: repos.currentId },
  });
  const branches = repos.currentId ? currentBranches : allBranches;

  const deleteBranch = useMutation(api.branches[":branchId"].$delete, {
    onSuccess: () => {
      allBranches.refetch();
      currentBranches.refetch();
    },
  });

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

      <FeatureCardGrid empty="No prototypes yet">
        {branches.data?.map((branch, index) => (
          <FeatureCard
            key={branch.id}
            title={branch.name}
            imageUrl={branch.imageUrl}
            date={branch.createdAt}
            user={branch.createdBy}
            index={index}
            onDelete={() =>
              deleteBranch.mutate({ param: { branchId: branch.id } })
            }
          />
        ))}
      </FeatureCardGrid>
    </section>
  );
}
