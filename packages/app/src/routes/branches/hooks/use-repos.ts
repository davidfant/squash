import { useChatInputContext } from "@/components/layout/chat/input/context";
import { api, useQuery } from "@/hooks/api";
import { useAuth } from "@clerk/clerk-react";
import { useMemo } from "react";
import { useLocalStorage } from "usehooks-ts";

export function useRepos() {
  const repos = useQuery(api.repos.$get, { params: {} });
  const input = useChatInputContext();
  const auth = useAuth();
  const [currentRepoId, setCurrentRepoId] = useLocalStorage<string | null>(
    `lp.${auth.orgId}.currentRepoId`,
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
    setCurrent: (id: string | null) => {
      setCurrentRepoId(id);
      if (id) input.setState(undefined);
    },
    isLoading: repos.isPending,
  };
}
