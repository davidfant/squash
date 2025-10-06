import { FeatureCard } from "@/components/blocks/feature/card";
import { FeatureCardGrid } from "@/components/blocks/feature/grid";
import { AppSidebar } from "@/components/layout/sidebar/app-sidebar";
import { SiteHeader } from "@/components/layout/sidebar/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { api, type QueryOutput, useQuery } from "@/hooks/api";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { RepoDetailsDialog } from "./components/repo-details-dialog";

type Repo = QueryOutput<typeof api.repos.$get>[number];

function RepoCard({ repo, index }: { repo: Repo; index: number }) {
  return (
    <Link to={`/playgrounds/${repo.id}`}>
      <FeatureCard
        title={repo.name}
        imageUrl={repo.imageUrl}
        index={index}
        className="cursor-pointer"
      />
    </Link>
  );
}

export function ReposPage() {
  const repos = useQuery(api.repos.$get, { params: {} });
  const { repoId } = useParams();

  const [currentRepo, setCurrentRepo] = useState<Repo>();
  useEffect(() => {
    const repo = repos.data?.find((repo) => repo.id === repoId);
    if (repo) setCurrentRepo(repo);
  }, [repoId, repos.data]);

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Playgrounds" />
        <main className="p-3 pt-0">
          <FeatureCardGrid
            children={
              repos.data
                ? [
                    ...repos.data.map((repo, index) => (
                      <RepoCard key={repo.id} repo={repo} index={index} />
                    )),
                    // <CreateRepoCard key="create" />,
                  ]
                : undefined
            }
          />
        </main>
      </SidebarInset>

      {/* Dialog is always rendered once we have repo data, but open state is controlled by URL */}
      {currentRepo && <RepoDetailsDialog repo={currentRepo} open={!!repoId} />}
    </SidebarProvider>
  );
}
