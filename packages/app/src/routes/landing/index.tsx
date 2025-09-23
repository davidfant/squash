import { authClient } from "@/auth";
import { Suggestion } from "@/components/ai-elements/suggestion";
import {
  ChatInput,
  type ChatInputValue,
} from "@/components/layout/chat/input/ChatInput";
import { ChatInputFileUploadsProvider } from "@/components/layout/chat/input/ChatInputFileUploadsContext";
import { toast } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";
import { api, useMutation } from "@/hooks/api";
import { SiGithub } from "@icons-pack/react-simple-icons";
import { memo } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { useLocalStorage } from "usehooks-ts";
import { CloneScreenshotAction } from "./components/CloneScreenshotAction";
import { HeaderMenu } from "./components/HeaderMenu";
import { RecentBranchesGrid } from "./components/RecentBranchesGrid";
import { RepoSelect } from "./components/RepoSelect";
import { useChatInputPlaceholder } from "./hooks/useChatInputPlaceholder";
import { useRepos } from "./hooks/useRepos";

const MemoizedTextarea = memo(Textarea);
const TextareaWithPlaceholder = memo(
  (props: React.ComponentProps<typeof Textarea>) => {
    const placeholder = useChatInputPlaceholder();
    return (
      <MemoizedTextarea
        {...props}
        placeholder={!!props.value ? undefined : placeholder}
      />
    );
  }
);

export function LandingPage() {
  const session = authClient.useSession();
  const navigate = useNavigate();
  const repos = useRepos();

  const [chatInitialValue, setChatInitialValue] =
    useLocalStorage<ChatInputValue>("BranchFeed.chatInitialValue", {
      text: "",
      files: [],
    });

  const createRepo = useMutation(api.repos.$post, {
    onError: () => toast.error("Failed to create repository"),
  });

  const createBranch = useMutation(api.repos[":repoId"].branches.$post, {
    onSuccess: (data) => navigate(`/branches/${data.id}`),
  });

  const handleSubmit = async (content: ChatInputValue) => {
    const repoId = await (async () => {
      if (repos.current) return repos.current.id;

      const newRepo = await createRepo.mutateAsync({
        json: {
          name: `base-${Date.now()}`,
          url: "s3://repos/templates/base-vite-ts",
          defaultBranch: "master",
          hidden: true,
          snapshot: {
            type: "docker",
            port: 5173,
            image: "registry.fly.io/squash-template:base-vite-ts-v0.0.1",
            workdir: "/repo",
            cmd: {
              prepare:
                "if [ ! -d $WORKDIR/.git ]; then mv /root/repo/* $WORKDIR; fi",
              entrypoint: "pnpm dev --port $PORT",
            },
          },
        },
      });

      return newRepo.id;
    })();

    await createBranch.mutateAsync({
      param: { repoId },
      json: {
        message: {
          parts: [{ type: "text", text: content.text }, ...content.files],
        },
      },
    });

    setChatInitialValue({ text: "", files: [] });
  };

  if (!session.isPending && !session.data?.user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 h-14">
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/preview-gradients/0.jpg"
            alt="Squash"
            className="size-8 rounded-full"
          />{" "}
          Squash
        </Link>
        <HeaderMenu />
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-24 gap-32">
        <section className="flex flex-col items-center gap-12 text-center">
          {/* <Badge variant="secondary" className="px-3 py-1.5 rounded-full">
            Build anything with AI
          </Badge> */}
          <h1 className="text-balance text-4xl font-light tracking-tight sm:text-5xl">
            Prototype your next feature
          </h1>
          {/* <p className="max-w-2xl text-balance text-lg text-muted-foreground">
            Start building with a single prompt. Describe your idea and we'll
            spin up a branch, preview, and deployment-ready project for you.
          </p> */}

          <ChatInputFileUploadsProvider initialValue={chatInitialValue.files}>
            <div className="w-full max-w-2xl">
              <ChatInput
                initialValue={chatInitialValue}
                clearOnSubmit={false}
                onSubmit={handleSubmit}
                submitting={createBranch.isPending}
                minRows={3}
                maxRows={10}
                Textarea={TextareaWithPlaceholder as any}
                disabled={createBranch.isPending}
                extra={<RepoSelect />}
              />

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <CloneScreenshotAction />
                <Link to="/new/repo">
                  <Suggestion suggestion="Import from Github" size="default">
                    <SiGithub />
                    Import from Github
                  </Suggestion>
                </Link>
              </div>
            </div>
          </ChatInputFileUploadsProvider>
        </section>
        <RecentBranchesGrid />
      </main>
    </>
  );
}
