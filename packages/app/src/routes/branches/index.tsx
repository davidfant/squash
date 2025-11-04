import { BranchFeatureCard } from "@/components/blocks/feature/branch-card";
import { FeatureCardGrid } from "@/components/blocks/feature/grid";
import { MainLayout } from "@/components/layout/main/layout";
import { api, useQuery } from "@/hooks/api";
import { Navigate } from "react-router";
import { useRepos } from "./hooks/use-repos";

export function BranchesPage() {
  const repos = useRepos();
  const branches = useQuery(api.branches.$get, {
    enabled: !repos.currentId,
    params: {},
  });

  if (branches.data?.length === 0) return <Navigate to="/new" />;
  return (
    <MainLayout title="Apps">
      <main className="p-3">
        <FeatureCardGrid
          children={branches.data?.map((b, index) => (
            <BranchFeatureCard
              key={b.id}
              branch={b}
              index={index}
              onDeleted={() => branches.refetch()}
              onUpdated={() => branches.refetch()}
            />
          ))}
        />
      </main>
    </MainLayout>
  );
}
