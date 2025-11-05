import { BranchFeatureCard } from "@/components/blocks/feature/branch-card";
import { FeatureCardGrid } from "@/components/blocks/feature/grid";
import { MainLayout } from "@/components/layout/main/layout";
import { api, useQuery } from "@/hooks/api";
import { useAuth } from "@clerk/clerk-react";
import { Navigate } from "react-router";
import { useRepos } from "./hooks/use-repos";

export function BranchesPage() {
  const repos = useRepos();
  const branches = useQuery(api.branches.$get, {
    enabled: !repos.currentId,
    params: {},
  });

  const { has } = useAuth();
  const isBuilder = has?.({ role: "org:admin" });
  if (branches.data?.length === 0 && isBuilder) return <Navigate to="/new" />;
  return (
    <MainLayout title="Apps">
      <main className="p-3">
        <FeatureCardGrid
          children={branches.data?.map((b, index) => (
            <BranchFeatureCard
              key={b.id}
              branch={b}
              index={index}
              onDeleted={isBuilder ? () => branches.refetch() : undefined}
              onUpdated={isBuilder ? () => branches.refetch() : undefined}
            />
          ))}
        />
      </main>
    </MainLayout>
  );
}
