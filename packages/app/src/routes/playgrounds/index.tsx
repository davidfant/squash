import { authClient } from "@/auth/client";
import { PlaygroundsSidebar } from "@/components/layout/sidebar2/PlaygroundsSidebar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { api, type QueryOutput, useMutation, useQuery } from "@/hooks/api";
import { BranchCard } from "@/routes/landing/components/BranchCard";
import { BranchCardSkeleton } from "@/routes/landing/components/BranchCardSkeleton";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router";

type Repo = QueryOutput<typeof api.repos.$get>[number];

function PlaygroundModal({
  repo,
  open,
  onOpenChange,
}: {
  repo: Repo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const branches = useQuery(api.repos[":repoId"].branches.$get, {
    params: { repoId: repo?.id || "" },
    enabled: open && !!repo,
  });

  const createBranch = useMutation(api.repos[":repoId"].branches.$post, {
    onSuccess: (data) => {
      onOpenChange(false);
      // Small delay to ensure dialog closes before navigation
      setTimeout(() => navigate(`/branches/${data.id}`), 100);
    },
    onError: () => toast.error("Failed to create prototype"),
  });

  const deleteBranch = useMutation(api.branches[":branchId"].$delete, {
    onSuccess: () => {
      branches.refetch();
    },
  });

  const handleCreatePrototype = async () => {
    if (!repo) return;
    await createBranch.mutateAsync({
      param: { repoId: repo.id },
      json: {
        message: {
          parts: [],
        },
      },
    });
  };

  if (!repo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl [&>button]:hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{repo.name}</DialogTitle>
            <Button
              onClick={handleCreatePrototype}
              loading={createBranch.isPending}
              disabled={createBranch.isPending}
            >
              Create prototype
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Preview placeholder */}
          <div className="aspect-video w-full bg-muted rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground text-sm">
              No preview available
            </p>
          </div>

          {/* Recent prototypes (branches) */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Recent prototypes</h3>
            {branches.isPending ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <BranchCardSkeleton key={i} index={i} />
                ))}
              </div>
            ) : branches.data && branches.data.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {branches.data.map((branch, index) => (
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
            ) : (
              <p className="text-sm text-muted-foreground">No prototypes yet</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PlaygroundCard({
  repo,
  index,
  onClick,
}: {
  repo: Repo;
  index: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col rounded-xl border overflow-hidden hover:border-primary transition-colors text-left"
    >
      {/* Preview placeholder */}
      <div
        className="aspect-video w-full bg-muted flex items-center justify-center"
        style={{
          backgroundImage: `url(/preview/gradients/${index % 8}.jpg)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* Content */}
      <div className="p-4 space-y-3">
        <h3 className="font-semibold truncate">{repo.name}</h3>
        <Button
          size="sm"
          variant="outline"
          className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
        >
          Start editing
        </Button>
      </div>
    </button>
  );
}

function CreatePlaygroundCard() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/new/repo")}
      className="group relative flex flex-col rounded-xl border-2 border-dashed overflow-hidden hover:border-primary transition-colors"
    >
      <div className="aspect-video w-full bg-muted/50 flex items-center justify-center">
        <Plus className="size-8 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <div className="p-4">
        <p className="font-semibold text-center text-muted-foreground group-hover:text-primary transition-colors">
          + Create
        </p>
      </div>
    </button>
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

  const handleCloseModal = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      // Delay clearing selectedRepo until after animation completes
      setTimeout(() => setSelectedRepo(null), 200);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <PlaygroundsSidebar />
      <div className="flex-1">
        <div className="container mx-auto px-8 py-12">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Playgrounds</h1>
            <p className="text-muted-foreground">
              Manage and explore your playgrounds
            </p>
          </div>

          {repos.isPending ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-[3/4] bg-muted rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {repos.data?.map((repo, index) => (
                <PlaygroundCard
                  key={repo.id}
                  repo={repo}
                  index={index}
                  onClick={() => handleOpenModal(repo)}
                />
              ))}
              <CreatePlaygroundCard />
            </div>
          )}

          <PlaygroundModal
            repo={selectedRepo}
            open={isModalOpen}
            onOpenChange={handleCloseModal}
          />
        </div>
      </div>
    </div>
  );
}
