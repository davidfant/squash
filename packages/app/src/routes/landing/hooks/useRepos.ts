import { authClient } from "@/auth";
import { api, useQuery } from "@/hooks/api";
import { useMemo } from "react";
import { useLocalStorage } from "usehooks-ts";

export function useRepos() {
  const repos = useQuery(api.repos.$get, { params: {} });
  const activeOrg = authClient.useActiveOrganization();
  const [currentRepoId, setCurrentRepoId] = useLocalStorage<string | null>(
    `lp.${activeOrg.data?.id}.currentRepoId`,
    null
  );

  const current = useMemo(
    () => repos.data?.find((repo) => repo.id === currentRepoId),
    [repos.data, currentRepoId]
  );

  // useEffect(() => {
  //   if (currentRepoId === undefined && repos.data?.length) {
  //     setCurrentRepoId(repos.data[0]!.id);
  //   }
  // }, [repos.data]);

  return {
    all: repos.data,
    current,
    currentId: currentRepoId,
    setCurrent: setCurrentRepoId,
    isLoading: repos.isPending,
  };
}
