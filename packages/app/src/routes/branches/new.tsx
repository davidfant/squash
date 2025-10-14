import { authClient } from "@/auth/client";
import { IframePreview } from "@/components/blocks/iframe-preview";
import { ChatEmptyState } from "@/components/layout/chat/ChatEmptyState";
import { ChatThread } from "@/components/layout/chat/ChatThread";
import { EmptyChatProvider } from "@/components/layout/chat/context";
import {
  ChatInputProvider,
  type ChatInputValue,
} from "@/components/layout/chat/input/context";
import { Button } from "@/components/ui/button";
import { api, useMutation, useQuery } from "@/hooks/api";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { useLocalStorage } from "usehooks-ts";

export function NewBranchFromRepoPage() {
  const repoId = useParams().repoId!;
  const repo = useQuery(api.repos[":repoId"].$get, { params: { repoId } });
  const createBranch = useMutation(api.repos[":repoId"].branches.$post);
  const forkRepo = useMutation(api.repos[":repoId"].fork.$post);
  const navigate = useNavigate();

  const [initialValue, setInitialValue] = useLocalStorage<
    ChatInputValue | undefined
  >(`NewBranchFromRepoPage.${repoId}.initialValue`, undefined);

  const isAuthenticated = !!authClient.useSession().data;
  const activeOrg = authClient.useActiveOrganization();

  return (
    <EmptyChatProvider
      onSendMessage={async (content) => {
        setInitialValue({
          text: content.text ?? "",
          files: content.files ?? [],
        });
        if (isAuthenticated) {
          const parts = [
            ...(content.text
              ? [{ type: "text" as const, text: content.text }]
              : []),
            ...(content.files ?? []),
          ];

          if (repo.data?.organizationId !== activeOrg.data?.id) {
            const forkedRepo = await forkRepo.mutateAsync({
              param: { repoId },
            });
            const branch = await createBranch.mutateAsync({
              param: { repoId: forkedRepo.id },
              json: { message: { parts } },
            });
            await navigate(`/prototypes/${branch.id}`);
          } else {
            const branch = await createBranch.mutateAsync({
              param: { repoId },
              json: { message: { parts } },
            });
            await navigate(`/prototypes/${branch.id}`);
          }
          // if repo does not belong to current organization, fork it!!
          setInitialValue(undefined);
        } else {
          navigate(`/login?redirect=${window.location.href}`);
        }
      }}
    >
      <ChatInputProvider initialValue={initialValue}>
        <div className="h-screen flex">
          <div className="flex flex-col w-1/3">
            <div className="flex items-center text-sm">
              <Link to={isAuthenticated ? `/playgrounds/${repoId}` : "/"}>
                <Button size="icon" variant="ghost">
                  <ArrowLeft className="size-4" />
                </Button>
              </Link>
              <span className="truncate">
                New Prototype in {repo.data?.name}
              </span>
            </div>
            <div className="flex-1">
              <ChatThread
                id={repoId}
                clearInputOnSubmit={false}
                empty={
                  <ChatEmptyState
                    suggestions={repo.data?.suggestions ?? undefined}
                  />
                }
              />
            </div>
          </div>
          <div className="p-2 pl-0 flex-1">
            <IframePreview
              url={repo.data?.previewUrl ?? null}
              imageUrl={repo.data?.imageUrl}
              loading={repo.isPending}
              className="h-full"
            />
          </div>
        </div>
      </ChatInputProvider>
    </EmptyChatProvider>
  );
}
