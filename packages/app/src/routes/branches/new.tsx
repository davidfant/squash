import { IframePreview } from "@/components/blocks/iframe-preview";
import { ChatThread } from "@/components/layout/chat/ChatThread";
import { EmptyChatProvider } from "@/components/layout/chat/context";
import { Button } from "@/components/ui/button";
import { api, useMutation, useQuery } from "@/hooks/api";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";

export function NewBranchFromRepoPage() {
  const repoId = useParams().repoId!;
  const repo = useQuery(api.repos[":repoId"].$get, { params: { repoId } });
  const createBranch = useMutation(api.repos[":repoId"].branches.$post);
  const navigate = useNavigate();
  return (
    <EmptyChatProvider
      onSendMessage={async (content) => {
        const parts = [
          ...(content.text
            ? [{ type: "text" as const, text: content.text }]
            : []),
          ...(content.files ?? []),
        ];
        const branch = await createBranch.mutateAsync({
          param: { repoId },
          json: { message: { parts } },
        });
        console.log("branch", branch);
        await navigate(`/prototypes/${branch.id}`);
      }}
    >
      <div className="h-screen flex">
        <div className="flex flex-col w-1/3">
          <div className="flex items-center text-sm">
            <Link to={`/playgrounds/${repoId}`}>
              <Button size="icon" variant="ghost">
                <ArrowLeft className="size-4" />
              </Button>
            </Link>
            New Prototype in {repo.data?.name}
          </div>
          <div className="flex-1">
            <ChatThread id={repoId} clearInputOnSubmit={false} />
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
    </EmptyChatProvider>
  );
}
