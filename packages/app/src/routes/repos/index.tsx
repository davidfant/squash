import { authClient } from "@/auth/client";
import { FeatureCard } from "@/components/blocks/feature/card";
import { FeatureCardGrid } from "@/components/blocks/feature/grid";
import { AppSidebar } from "@/components/layout/main/sidebar/app-sidebar";
import { SiteHeader } from "@/components/layout/main/sidebar/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { toast } from "@/components/ui/sonner";
import { api, type QueryOutput, useMutation, useQuery } from "@/hooks/api";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { RepoDetailsDialog } from "./components/repo-details-dialog";

type Repo = QueryOutput<typeof api.repos.$get>[number];

function RepoCard({
  repo,
  index,
  editable,
  onRenamed,
}: {
  repo: Repo;
  index: number;
  editable?: boolean;
  onRenamed?: () => void;
}) {
  const renameRepo = useMutation(api.repos[":repoId"].$patch, {
    onSuccess: () => {
      toast.success("Playground renamed");
      onRenamed?.();
    },
    onError: () => toast.error("Failed to rename playground"),
  });
  return (
    <Link to={`/templates/${repo.id}`}>
      <FeatureCard
        title={repo.name}
        imageUrl={repo.imageUrl}
        index={index}
        className="cursor-pointer"
        onEdit={
          editable
            ? (name) =>
                renameRepo.mutateAsync({
                  param: { repoId: repo.id },
                  json: { name },
                })
            : undefined
        }
      />
    </Link>
  );
}

export function ReposPage() {
  const navigate = useNavigate();

  const isAuthenticated = !!authClient.useSession().data?.session;
  const orgRepos = useQuery(api.repos.$get, {
    params: {},
    enabled: isAuthenticated,
  });
  const publicRepos = useQuery(api.repos.public.$get, { params: {} });
  const { repoId } = useParams();

  const [currentRepo, setCurrentRepo] = useState<Repo>();
  useEffect(() => {
    const allRepos = [...(orgRepos.data ?? []), ...(publicRepos.data ?? [])];
    const repo = allRepos.find((r) => r.id === repoId);
    if (repo) setCurrentRepo(repo);
  }, [repoId, orgRepos.data, publicRepos.data]);

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Templates" />
        <main className="p-3">
          <FeatureCardGrid
            children={orgRepos.data?.map((repo, index) => (
              <RepoCard
                key={repo.id}
                repo={repo}
                index={index}
                editable
                onRenamed={() => orgRepos.refetch()}
              />
            ))}
          />
          <h2 className="text-lg mt-8 mb-4">Featured Templates</h2>
          <FeatureCardGrid
            children={publicRepos.data?.map((repo, index) => (
              <RepoCard key={repo.id} repo={repo} index={index} />
            ))}
          />
        </main>
      </SidebarInset>

      {/* Dialog is always rendered once we have repo data, but open state is controlled by URL */}
      {currentRepo && (
        <RepoDetailsDialog
          repo={currentRepo}
          open={!!repoId}
          onOpenChange={() => navigate("/templates")}
        />
      )}
    </SidebarProvider>
  );
}
