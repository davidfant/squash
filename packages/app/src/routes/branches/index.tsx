import { FeatureCard } from "@/components/blocks/feature/card";
import { FeatureCardGrid } from "@/components/blocks/feature/grid";
import { AppSidebar } from "@/components/layout/sidebar/app-sidebar";
import { SiteHeader } from "@/components/layout/sidebar/site-header";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { api, type QueryOutput, useQuery } from "@/hooks/api";
import { Check, ChevronDown } from "lucide-react";
import { Link } from "react-router";
import { useRepos } from "../landing/hooks/useRepos";

type Branch = QueryOutput<typeof api.branches.$get>[number];

function BranchCard({ branch, index }: { branch: Branch; index: number }) {
  return (
    <Link to={`/prototypes/${branch.id}`}>
      <FeatureCard
        title={branch.name}
        imageUrl={branch.imageUrl}
        index={index}
        className="cursor-pointer"
      />
    </Link>
  );
}

export function BranchesPage() {
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

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader
          title="Prototypes"
          extra={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  {!repos.current ? "All playgrounds" : repos.current.name}
                  <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => repos.setCurrent(null)}>
                  All playgrounds
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
          }
        />
        <main className="p-3 pt-0">
          <FeatureCardGrid
            children={
              branches.data
                ? branches.data.map((b, index) => (
                    <BranchCard key={b.id} branch={b} index={index} />
                  ))
                : undefined
            }
          />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
