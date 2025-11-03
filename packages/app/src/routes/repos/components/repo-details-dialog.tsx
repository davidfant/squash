import { IframePreview } from "@/components/blocks/iframe-preview";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SignedIn, SignedOut, SignUpButton } from "@clerk/clerk-react";
import { Link, useNavigate } from "react-router";

export function RepoDetailsDialog({
  repo,
  open,
  onOpenChange,
}: {
  repo: {
    id: string;
    name: string;
    imageUrl: string | null;
    previewUrl: string | null;
  };
  open: boolean;
  onOpenChange(open: boolean): void;
}) {
  const navigate = useNavigate();
  // const branches = useQuery(api.repos[":repoId"].branches.$get, {
  //   params: { repoId: repo.id },
  //   enabled: open,
  // });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-5xl @container p-0 gap-2 top-[10%] max-h-[80vh] translate-y-0 overflow-hidden flex flex-col"
        closeButton={false}
      >
        <DialogHeader className="p-4 pb-0 flex-row items-center justify-between">
          <DialogTitle className="pl-1">{repo.name}</DialogTitle>
          <SignedIn>
            <Link to={`/templates/${repo.id}/new`}>
              <Button>Use Template</Button>
            </Link>
          </SignedIn>
          <SignedOut>
            <SignUpButton mode="modal">
              <Button variant="outline">Log In</Button>
            </SignUpButton>
          </SignedOut>
        </DialogHeader>

        <div className="p-4 pt-0 flex-1 overflow-y-auto">
          <IframePreview
            url={repo.previewUrl}
            imageUrl={repo.imageUrl}
            className="aspect-video"
          />

          {/* Recent prototypes (branches) */}
          {/* <h3 className="mt-12 mb-2 ml-1">Recent Prototypes</h3>
          <FeatureCardGrid
            empty="No prototypes yet. Create the first one by clicking the button in
              the top right corner!"
          >
            {branches.data?.map((b, index) => (
              <BranchFeatureCard
                key={b.id}
                branch={b}
                index={index}
                onDeleted={() => branches.refetch()}
                onUpdated={() => branches.refetch()}
              />
            ))}
          </FeatureCardGrid> */}
        </div>
      </DialogContent>
    </Dialog>
  );
}
