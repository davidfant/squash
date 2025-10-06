import { authClient } from "@/auth/client";
import { FeatureCard } from "@/components/blocks/feature/card";
import { FeatureCardGrid } from "@/components/blocks/feature/grid";
import { AppSidebar } from "@/components/layout/sidebar/app-sidebar";
import { SiteHeader } from "@/components/layout/sidebar/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { api, type QueryOutput, useQuery } from "@/hooks/api";
import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router";
import { RepoDetailsDialog } from "./components/repo-details-dialog";

type Repo = QueryOutput<typeof api.repos.$get>[number];

function PlaygroundCard({ repo, index }: { repo: Repo; index: number }) {
  return (
    <Link to={`/playgrounds/${repo.id}`}>
      <FeatureCard
        title={repo.name}
        imageUrl={null}
        // imageUrl={repo.imageUrl}
        index={index}
        className="cursor-pointer"
      />
    </Link>
  );
}

export function PlaygroundsPage() {
  const session = authClient.useSession();
  const repos = useQuery(api.repos.$get, { params: {} });
  const { repoId } = useParams();

  // Keep the last selected repo in a ref so it persists during close animation

  // If not authenticated, redirect to login page
  if (!session.isPending && !session.data?.user) {
    return <Navigate to="/login" replace />;
  }

  // Find the selected repo based on URL param
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
                      <PlaygroundCard key={repo.id} repo={repo} index={index} />
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
