import { api, useMutation } from "@/hooks/api";
import { formatDate } from "@/lib/date";
import { Link } from "react-router";
import { FeatureCard } from "./card";

export function BranchFeatureCard({
  branch,
  index,
  onDeleted,
}: {
  branch: {
    id: string;
    title: string;
    imageUrl: string | null;
    createdAt: string;
    createdBy: { name: string; image: string | null };
  };
  index: number;
  onDeleted: () => void;
}) {
  const deleteBranch = useMutation(api.branches[":branchId"].$delete, {
    onSuccess: onDeleted,
  });
  return (
    <Link to={`/prototypes/${branch.id}`}>
      <FeatureCard
        title={branch.title}
        imageUrl={branch.imageUrl}
        subtitle={formatDate(branch.createdAt)}
        avatar={branch.createdBy}
        index={index}
        onDelete={() => deleteBranch.mutate({ param: { branchId: branch.id } })}
      />
    </Link>
  );
}
