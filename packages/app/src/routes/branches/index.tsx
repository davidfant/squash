import { FeatureCard } from "@/components/blocks/feature/card";
import { FeatureCardGrid } from "@/components/blocks/feature/grid";
import { MainLayout } from "@/components/layout/main/layout";
import { toast } from "@/components/ui/sonner";
import { api, useMutation, useQuery } from "@/hooks/api";
import { useAuth } from "@clerk/clerk-react";
import { Link, Navigate } from "react-router";

export function BranchesPage() {
  const repos = useQuery(api.repos.$get, { params: {} });

  const { has } = useAuth();
  const isBuilder = has?.({ role: "org:admin" });
  const updateRepo = useMutation(api.repos[":repoId"].$patch, {
    onSuccess: async () => {
      toast.success("App renamed");
      await repos.refetch();
    },
    onError: () => toast.error("Failed to rename app"),
  });
  const deleteRepo = useMutation(api.repos[":repoId"].$delete, {
    onSuccess: async () => {
      toast.success("App deleted");
      await repos.refetch();
    },
    onError: () => toast.error("Failed to delete app"),
  });

  if (repos.data?.length === 0 && isBuilder) return <Navigate to="/new" />;
  return (
    <MainLayout title="Apps">
      <main className="p-3">
        <FeatureCardGrid
          children={repos.data?.map((b, index) => (
            <Link key={b.id} to={`/apps/${b.masterBranchId}`}>
              <FeatureCard
                title={b.name}
                imageUrl={b.imageUrl}
                index={index}
                onEdit={
                  isBuilder
                    ? (name) =>
                        updateRepo.mutateAsync({
                          param: { repoId: b.id },
                          json: { name },
                        })
                    : undefined
                }
                onDelete={
                  isBuilder
                    ? () => deleteRepo.mutate({ param: { repoId: b.id } })
                    : undefined
                }
              />
            </Link>
          ))}
        />
      </main>
    </MainLayout>
  );
}
