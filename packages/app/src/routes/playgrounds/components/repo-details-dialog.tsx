import { FeatureCard } from "@/components/blocks/feature/card";
import { FeatureCardSkeleton } from "@/components/blocks/feature/card-skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { api, useMutation, useQuery } from "@/hooks/api";
import { useNavigate } from "react-router";

export function RepoDetailsDialog({
  repo,
  open,
  onOpenChange,
}: {
  repo: {
    id: string;
    name: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const branches = useQuery(api.repos[":repoId"].branches.$get, {
    params: { repoId: repo?.id || "" },
    enabled: open && !!repo,
  });

  const createBranch = useMutation(api.repos[":repoId"].branches.$post, {
    onSuccess: (data) => navigate(`/branches/${data.id}`),
    onError: () => toast.error("Failed to create prototype"),
  });

  const deleteBranch = useMutation(api.branches[":branchId"].$delete, {
    onSuccess: () => branches.refetch(),
  });

  const handleCreatePrototype = async () => {
    if (!repo) return;
    await createBranch.mutateAsync({
      param: { repoId: repo.id },
      json: {},
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-5xl @container p-0 gap-2 top-[10%] max-h-[80vh] translate-y-0 overflow-hidden flex flex-col"
        closeButton={false}
      >
        <DialogHeader className="p-4 pb-0 flex-row items-center justify-between">
          <DialogTitle>{repo.name}</DialogTitle>
          <Button
            onClick={handleCreatePrototype}
            loading={createBranch.isPending}
            disabled={createBranch.isPending}
          >
            Create prototype
          </Button>
        </DialogHeader>

        <div className="p-4 pt-0 flex-1 overflow-y-auto">
          {/* Preview placeholder */}
          <div className="aspect-video w-full bg-muted rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground text-sm">
              No preview available
            </p>
          </div>

          {/* Recent prototypes (branches) */}
          <h3 className="mt-4 mb-2">Recent prototypes</h3>
          {branches.data?.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No prototypes yet. Create the first one by clicking the button in
              the top right corner!
            </p>
          ) : (
            <div className="grid grid-cols-1 @md:grid-cols-2 @lg:grid-cols-3 @xl:grid-cols-4 gap-4">
              {branches.isPending
                ? [...Array(12)].map((_, i) => (
                    <FeatureCardSkeleton key={i} index={i} />
                  ))
                : branches.data?.map((b, index) => (
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
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
