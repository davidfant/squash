import { api, useQuery } from "@/hooks/api";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useMemo } from "react";

export function useCurrentRepo() {
  const repos = useQuery(api.repos.$get, { params: {} });
  const [currentRepoId, setCurrentRepoId] = useLocalStorage<string | null>(
    "currentRepoId",
    null
  );

  const currentRepo = useMemo(() => {
    if (!repos.data || repos.data.length === 0) return null;

    // If no repo is selected or selected repo is not found, default to first repo
    let selectedRepo = null;
    if (currentRepoId) {
      selectedRepo =
        repos.data.find((repo) => repo.id === currentRepoId) ?? null;
    }

    if (!selectedRepo && repos.data.length > 0) {
      selectedRepo = repos.data[0];
      // Update localStorage to persist the default selection
      if (selectedRepo) {
        setCurrentRepoId(selectedRepo.id);
      }
    }

    return selectedRepo;
  }, [currentRepoId, repos.data, setCurrentRepoId]);

  const effectiveRepoId = currentRepo?.id ?? null;

  return {
    repos: repos.data,
    currentRepoId: effectiveRepoId,
    currentRepo,
    setCurrentRepoId,
    isLoading: repos.isPending,
  };
}
