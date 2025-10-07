import { authClient } from "@/auth/client";
import { BranchFeatureCard } from "@/components/blocks/feature/branch-card";
import { FeatureCardGrid } from "@/components/blocks/feature/grid";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api, useQuery } from "@/hooks/api";
import { Check, ChevronDown } from "lucide-react";
import { useLocalStorage } from "usehooks-ts";
import { useRepos } from "../hooks/useRepos";

export function RecentBranchesGrid() {
  const repos = useRepos();
  const activeOrg = authClient.useActiveOrganization();
  const [currentRepoId, setCurrentRepoId] = useLocalStorage<string | null>(
    `lp.${activeOrg.data?.id}.currentRepoId`,
    null
  );

  const allBranches = useQuery(api.branches.$get, {
    enabled: !currentRepoId,
    params: {},
  });
  const currentBranches = useQuery(api.repos[":repoId"].branches.$get, {
    enabled: !!currentRepoId,
    params: { repoId: currentRepoId },
  });
  const branches = currentRepoId ? currentBranches : allBranches;

  const refresh = () => {
    allBranches.refetch();
    currentBranches.refetch();
  };

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
          <BranchFeatureCard
            key={branch.id}
            branch={branch}
            index={index}
            onDeleted={refresh}
            onUpdated={refresh}
          />
        ))}
      </FeatureCardGrid>
    </section>
  );
}
