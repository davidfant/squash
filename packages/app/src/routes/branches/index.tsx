import { BranchFeatureCard } from "@/components/blocks/feature/branch-card";
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
import { api, useQuery } from "@/hooks/api";
import { Check, ChevronDown } from "lucide-react";
import { useRepos } from "./hooks/use-repos";

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
        <main className="p-3">
          <FeatureCardGrid
            children={branches.data?.map((b, index) => (
              <BranchFeatureCard
                key={b.id}
                branch={b}
                index={index}
                onDeleted={() => branches.refetch()}
                onUpdated={() => branches.refetch()}
              />
            ))}
          />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
