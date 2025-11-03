import { RepoDetailsDialog } from "@/routes/repos/components/repo-details-dialog";
import { useState } from "react";
import { FeatureCard } from "./card";

export function RepoCard({
  repo,
  index,
}: {
  repo: {
    id: string;
    name: string;
    imageUrl: string | null;
    previewUrl: string | null;
  };
  index: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <FeatureCard
        title={repo.name}
        imageUrl={repo.imageUrl}
        index={index}
        className="cursor-pointer"
        onClick={() => setOpen(true)}
      />
      <RepoDetailsDialog repo={repo} open={open} onOpenChange={setOpen} />
    </>
  );
}
