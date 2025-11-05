import { toast } from "@/components/ui/sonner";
import { api, useMutation } from "@/hooks/api";
import { formatDate } from "@/lib/date";
import { Link } from "react-router";
import { FeatureCard } from "./card";

export function BranchFeatureCard({
  branch,
  index,
  onDeleted,
  onUpdated,
}: {
  branch: {
    id: string;
    // title: string;
    imageUrl: string | null;
    createdAt: string;
    repo: { name: string };
    createdBy: {
      firstName: string | null;
      lastName: string | null;
      imageUrl: string | null;
    } | null;
  };
  index: number;
  onDeleted?: () => void;
  onUpdated?: () => void;
}) {
  const deleteBranch = useMutation(api.branches[":branchId"].$delete, {
    onSuccess: () => {
      toast.success("App deleted");
      onDeleted?.();
    },
  });
  const updateBranch = useMutation(api.branches[":branchId"].$patch, {
    onSuccess: () => {
      toast.success("App renamed");
      onUpdated?.();
    },
    onError: () => toast.error("Failed to rename prototype"),
  });
  return (
    <Link to={`/apps/${branch.id}`}>
      <FeatureCard
        title={branch.repo.name}
        imageUrl={branch.imageUrl}
        subtitle={formatDate(branch.createdAt)}
        avatar={branch.createdBy}
        index={index}
        onDelete={
          onDeleted
            ? () => deleteBranch.mutate({ param: { branchId: branch.id } })
            : undefined
        }
        onEdit={
          onUpdated
            ? (title) =>
                updateBranch.mutateAsync({
                  param: { branchId: branch.id },
                  json: { title },
                })
            : undefined
        }
      />
    </Link>
  );
}
