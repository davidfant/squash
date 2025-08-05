import { authClient } from "@/auth";
import { CurrentUserAvatar } from "@/components/layout/auth/avatar/CurrentUserAvatar";
import { SignInButton } from "@/components/layout/auth/SignInButton";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/layout/sidebar/theme-toggle";
import { api, useQuery } from "@/hooks/api";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router";
import { BranchFeed } from "./BranchFeed";

export const useSelectedRepoId = () =>
  useLocalStorage<string | undefined>("lp.selectedRepoId", undefined);

export function LandingPage() {
  const { t } = useTranslation("landing");
  const session = authClient.useSession();

  const [selectedRepoId, setSelectedRepoId] = useSelectedRepoId();
  const repos = useQuery(api.repos.$get, { params: {} });

  // Set default selectedRepoId to first available repo
  useEffect(() => {
    if (repos.data && repos.data.length > 0 && !selectedRepoId) {
      setSelectedRepoId(repos.data[0]!.id);
    }
  }, [repos.data, selectedRepoId, setSelectedRepoId]);

  // If not authenticated, redirect to login
  if (!session.isPending && !session.data?.user) {
    return <Navigate to="/login" replace />;
  }

  // If user has repos and a selected repo, show the BranchFeed with sidebar
  if (!!repos.data?.length && selectedRepoId) {
    return <BranchFeed />;
  }

  // Otherwise show loading state
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-semibold">hypershape</h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <CurrentUserAvatar
              fallback={<SignInButton>{t("startBuilding")}</SignInButton>}
            />
          </div>
        </div>
      </header>

      {/* Loading State */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6 mt-16">
          {/* Loading skeleton for sidebar */}
          <div className="flex gap-6">
            <div className="w-64 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-8 w-4/5" />
            </div>
            {/* Loading skeleton for main content */}
            <div className="flex-1 space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-8 w-1/2" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
