import { FeatureCard } from "@/components/blocks/feature/card";
import { FeatureCardGrid } from "@/components/blocks/feature/grid";
import { MainLayout } from "@/components/layout/main/layout";
import { toast } from "@/components/ui/sonner";
import { api, useMutation, useQuery } from "@/hooks/api";
import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { RepoDetailsDialog } from "./components/repo-details-dialog";

interface Repo {
  id: string;
  name: string;
  imageUrl: string | null;
  previewUrl: string | null;
}

function RepoCard({
  repo,
  index,
  editable,
  onRenamed,
}: {
  repo: Repo;
  index: number;
  editable?: boolean;
  onRenamed?: () => void;
}) {
  const renameRepo = useMutation(api.repos[":repoId"].$patch, {
    onSuccess: () => {
      toast.success("Playground renamed");
      onRenamed?.();
    },
    onError: () => toast.error("Failed to rename playground"),
  });
  return (
    <Link to={`/templates/${repo.id}`}>
      <FeatureCard
        title={repo.name}
        imageUrl={repo.imageUrl}
        index={index}
        className="cursor-pointer"
        onEdit={
          editable
            ? (name) =>
                renameRepo.mutateAsync({
                  param: { repoId: repo.id },
                  json: { name },
                })
            : undefined
        }
      />
    </Link>
  );
}

export function ReposPage() {
  const navigate = useNavigate();

  const auth = useAuth();
  const orgRepos = useQuery(api.repos.$get, {
    params: {},
    enabled: auth.isSignedIn,
  });
  const featuredRepos = useQuery(api.repos.featured.$get, { params: {} });
  const { repoId } = useParams();

  const [currentRepo, setCurrentRepo] = useState<Repo>();
  useEffect(() => {
    const allRepos = [...(orgRepos.data ?? []), ...(featuredRepos.data ?? [])];
    const repo = allRepos.find((r) => r.id === repoId);
    if (repo) setCurrentRepo(repo);
  }, [repoId, orgRepos.data, featuredRepos.data]);

  return (
    <MainLayout title="Templates">
      <main className="p-3">
        {/* <FeatureCardGrid
            children={orgRepos.data?.map((repo, index) => (
              <RepoCard
                key={repo.id}
                repo={repo}
                index={index}
                editable
                onRenamed={() => orgRepos.refetch()}
              />
            ))}
          />
          <h2 className="text-lg mt-8 mb-4">Featured Templates</h2> */}
        <FeatureCardGrid
          children={featuredRepos.data?.map((repo, index) => (
            <RepoCard key={repo.id} repo={repo} index={index} />
          ))}
        />
      </main>
      {currentRepo && (
        <RepoDetailsDialog
          repo={currentRepo}
          open={!!repoId}
          onOpenChange={() => navigate("/templates")}
        />
      )}
    </MainLayout>
  );
}
