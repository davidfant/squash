import { FeatureCard } from "@/components/blocks/feature/card";
import { FeatureCardGrid } from "@/components/blocks/feature/grid";
import { IframePreview } from "@/components/blocks/iframe-preview";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { api, useMutation, useQuery } from "@/hooks/api";
import { Link, useNavigate } from "react-router";

export function RepoDetailsDialog({
  repo,
  open,
}: {
  repo: {
    id: string;
    name: string;
  };
  open: boolean;
}) {
  const navigate = useNavigate();
  const branches = useQuery(api.repos[":repoId"].branches.$get, {
    params: { repoId: repo.id },
    enabled: open,
  });

  const createBranch = useMutation(api.repos[":repoId"].branches.$post, {
    onSuccess: (data) => navigate(`/branches/${data.id}`),
    onError: () => toast.error("Failed to create prototype"),
  });

  const deleteBranch = useMutation(api.branches[":branchId"].$delete, {
    onSuccess: () => branches.refetch(),
  });

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      navigate("/playgrounds");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-5xl @container p-0 gap-2 top-[10%] max-h-[80vh] translate-y-0 overflow-hidden flex flex-col"
        closeButton={false}
      >
        <DialogHeader className="p-4 pb-0 flex-row items-center justify-between">
          <DialogTitle>{repo.name}</DialogTitle>
          <Link to={`/playgrounds/${repo.id}/new`}>
            <Button
              loading={createBranch.isPending}
              disabled={createBranch.isPending}
            >
              Create prototype
            </Button>
          </Link>
        </DialogHeader>

        <div className="p-4 pt-0 flex-1 overflow-y-auto">
          <IframePreview
            url="https://feat-build-core-layout-shadcn-themes-fba9a22a.squashprototype.com/"
            className="aspect-video"
          />

          {/* Recent prototypes (branches) */}
          <h3 className="mt-4 mb-2">Recent prototypes</h3>
          <FeatureCardGrid
            empty="No prototypes yet. Create the first one by clicking the button in
              the top right corner!"
          >
            {branches.data?.map((b, index) => (
              <FeatureCard
                key={b.id}
                title={b.name}
                imageUrl={b.imageUrl}
                date={b.createdAt}
                user={b.createdBy}
                index={index}
                onDelete={() =>
                  deleteBranch.mutate({ param: { branchId: b.id } })
                }
              />
            ))}
          </FeatureCardGrid>
        </div>
      </DialogContent>
    </Dialog>
  );
}
