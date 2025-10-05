import { authClient } from "@/auth/client";
import { FeatureCard } from "@/components/blocks/feature/card";
import { FeatureCardSkeleton } from "@/components/blocks/feature/card-skeleton";
import { AppSidebar } from "@/components/layout/sidebar/app-sidebar";
import { SiteHeader } from "@/components/layout/sidebar/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { api, type QueryOutput, useQuery } from "@/hooks/api";
import { useState } from "react";
import { Navigate } from "react-router";
import { CreateRepoCard } from "./components/create-repo-card";
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
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {repos.isPending ? (
              [...Array(6)].map((_, i) => (
                <FeatureCardSkeleton key={i} index={i} />
              ))
            ) : (
              <>
                {repos.data?.map((repo, index) => (
                  <PlaygroundCard key={repo.id} repo={repo} index={index} />
                ))}
                <CreateRepoCard />
              </>
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );

  // return (
  //   <div className="flex min-h-screen bg-background">
  //     <AppSidebar />
  //     <div className="flex-1">
  //       <div className="container mx-auto px-8 py-12">
  //         <div className="mb-8">
  //           <h1 className="text-3xl font-bold mb-2">Playgrounds</h1>
  //           <p className="text-muted-foreground">
  //             Manage and explore your playgrounds
  //           </p>
  //         </div>

  //         {repos.isPending ? (
  //           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  //             {[...Array(8)].map((_, i) => (
  //               <div
  //                 key={i}
  //                 className="aspect-[3/4] bg-muted rounded-xl animate-pulse"
  //               />
  //             ))}
  //           </div>
  //         ) : (
  //           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  //             {repos.data?.map((repo, index) => (
  //               <PlaygroundCard
  //                 key={repo.id}
  //                 repo={repo}
  //                 index={index}
  //                 onClick={() => handleOpenModal(repo)}
  //               />
  //             ))}
  //             <CreatePlaygroundCard />
  //           </div>
  //         )}

  //         <PlaygroundModal
  //           repo={selectedRepo}
  //           open={isModalOpen}
  //           onOpenChange={handleCloseModal}
  //         />
  //       </div>
  //     </div>
  //   </div>
  // );
}
