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
    title: string;
    imageUrl: string | null;
    createdAt: string;
    createdBy: {
      firstName: string | null;
      lastName: string | null;
      imageUrl: string | null;
    };
  };
  index: number;
  onDeleted: () => void;
  onUpdated?: () => void;
}) {
  const deleteBranch = useMutation(api.branches[":branchId"].$delete, {
    onSuccess: onDeleted,
  });
  const updateBranch = useMutation(api.branches[":branchId"].$patch, {
    onSuccess: () => {
      toast.success("Prototype renamed");
      onUpdated?.();
    },
    onError: () => toast.error("Failed to rename prototype"),
  });
  return (
    <Link to={`/apps/${branch.id}`}>
      <FeatureCard
        title={branch.title}
        imageUrl={branch.imageUrl}
        subtitle={formatDate(branch.createdAt)}
        avatar={branch.createdBy}
        index={index}
        onDelete={() => deleteBranch.mutate({ param: { branchId: branch.id } })}
        onEdit={(title) =>
          updateBranch.mutateAsync({
            param: { branchId: branch.id },
            json: { title },
          })
        }
      />
    </Link>
  );
}
