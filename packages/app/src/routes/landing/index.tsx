import { CurrentUserAvatar } from "@/components/layout/auth/avatar/CurrentUserAvatar";
import { SignInButton } from "@/components/layout/auth/SignInButton";
import { ChatInput } from "@/components/layout/chat/input/ChatInput";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, useMutation, useQuery } from "@/hooks/api";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";

export const useSelectedRepoId = () =>
  useLocalStorage<string | undefined>("lp.selectedRepoId", undefined);

export function LandingPage() {
  const navigate = useNavigate();
  const { t } = useTranslation("landing");

  const [selectedRepoId, setSelectedRepoId] = useSelectedRepoId();
  const repos = useQuery(api.repos.$get, { params: {} });
  const branches = useQuery(api.repos[":repoId"].branches.$get, {
    params: { repoId: selectedRepoId! },
    enabled: !!selectedRepoId,
  });

  const createBranch = useMutation(api.repos[":repoId"].branches.$post, {
    onSuccess: (data) => navigate(`/branches/${data.id}`),
  });

  // Set default selectedRepoId to first available repo
  useEffect(() => {
    if (repos.data && repos.data.length > 0 && !selectedRepoId) {
      setSelectedRepoId(repos.data[0]!.id);
    }
  }, [repos.data, selectedRepoId, setSelectedRepoId]);

  return (
    <>
      <header>
        hypershape
        <CurrentUserAvatar
          fallback={<SignInButton>{t("startBuilding")}</SignInButton>}
        />
      </header>

      {!!repos.data?.length ? (
        <>
          <Select value={selectedRepoId} onValueChange={setSelectedRepoId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a repository" />
            </SelectTrigger>
            <SelectContent>
              {repos.data.map((repo) => (
                <SelectItem key={repo.id} value={repo.id}>
                  {repo.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ChatInput
            onSubmit={(content) =>
              createBranch.mutate({
                param: { repoId: selectedRepoId! },
                json: { content },
              })
            }
            placeholder="What do you want to build?"
            submitting={createBranch.isPending}
          />

          {branches.data && (
            <div>
              <Label>Branches</Label>
              {branches.data.map((branch) => (
                <Link key={branch.id} to={`/branches/${branch.id}`}>
                  <Button variant="link">{branch.name}</Button>
                </Link>
              ))}
            </div>
          )}
        </>
      ) : (
        <a href={`${import.meta.env.VITE_API_URL}/integrations/github/connect`}>
          <Button>Connect Github</Button>
        </a>
      )}
    </>
  );
}
