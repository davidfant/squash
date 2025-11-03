import { BranchFeatureCard } from "@/components/blocks/feature/branch-card";
import { FeatureCardGrid } from "@/components/blocks/feature/grid";
import { MainLayout } from "@/components/layout/main/layout";
import { api, useQuery } from "@/hooks/api";
import { Link } from "react-router";
import { useRepos } from "./hooks/use-repos";

export function BranchesPage() {
  const repos = useRepos();
  const branches = useQuery(api.branches.$get, {
    enabled: !repos.currentId,
    params: {},
  });

  return (
    <MainLayout title="Apps">
      <main className="p-3">
        <FeatureCardGrid
          empty={
            <span>
              No apps found.{" "}
              <Link to="/new" className="underline">
                Create a new app
              </Link>
            </span>
          }
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
