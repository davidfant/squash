import { authClient } from "@/auth/client";
import { FeatureCard } from "@/components/blocks/feature/card";
import { FeatureCardGrid } from "@/components/blocks/feature/grid";
import { AppSidebar } from "@/components/layout/sidebar/app-sidebar";
import { SiteHeader } from "@/components/layout/sidebar/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { api, type QueryOutput, useQuery } from "@/hooks/api";
import { useState } from "react";
import { Navigate } from "react-router";
import { RepoDetailsDialog } from "./components/repo-details-dialog";

type Repo = QueryOutput<typeof api.repos.$get>[number];

function PlaygroundCard({ repo, index }: { repo: Repo; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <FeatureCard
        title={repo.name}
        imageUrl={null}
        // imageUrl={repo.imageUrl}
        index={index}
        className="cursor-pointer"
        onClick={() => setOpen(true)}
      />
      <RepoDetailsDialog repo={repo} open={open} onOpenChange={setOpen} />
    </>
  );
}

export function PlaygroundsPage() {
  const session = authClient.useSession();
  const repos = useQuery(api.repos.$get, { params: {} });
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // If not authenticated, redirect to login page
  if (!session.isPending && !session.data?.user) {
    return <Navigate to="/login" replace />;
  }

  const handleOpenModal = (repo: Repo) => {
    setSelectedRepo(repo);
    setIsModalOpen(true);
  };
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
    </SidebarProvider>
  );
}
