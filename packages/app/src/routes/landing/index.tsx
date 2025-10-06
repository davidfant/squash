import { Suggestion } from "@/components/ai-elements/suggestion";
import { ChatInput } from "@/components/layout/chat/input/ChatInput";
import {
  ChatInputProvider,
  type ChatInputValue,
} from "@/components/layout/chat/input/context";
import { Logo } from "@/components/Logo";
import { toast } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";
import { api, useMutation } from "@/hooks/api";
import { SiGithub } from "@icons-pack/react-simple-icons";
import { memo } from "react";
import { Link, useNavigate } from "react-router";
import { useLocalStorage } from "usehooks-ts";
import { CloneScreenshotAction } from "./components/CloneScreenshotAction";
import { HeaderMenu } from "./components/header/HeaderMenu";
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
            type: "daytona",
            snapshot: "base-vite-ts:v0.0.4",
            port: 5173,
            cwd: "/repo",
            env: {},
            tasks: {
              install: [
                {
                  id: "install",
                  title: "Install dependencies",
                  type: "command",
                  command: "pnpm",
                  args: ["install"],
                },
              ],
              dev: {
                id: "dev",
                title: "Start development server",
                type: "command",
                command: "pnpm",
                args: ["dev"],
              },
              build: [
                {
                  id: "build",
                  title: "Build",
                  type: "command",
                  command: "pnpm",
                  args: ["build"],
                },
              ],
            },
            build: { type: "static", dir: "dist" },
          },
        },
      });

      return newRepo.id;
    })();

    await createBranch.mutateAsync({
      param: { repoId },
      json: {
        message: {
          parts: [
            { type: "text", text: content.text },
            ...content.files,
            ...(content.state
              ? [{ type: "data-AgentState" as const, data: content.state }]
              : []),
          ],
        },
      },
    });

    setChatInitialValue({ text: "", files: [] });
  };

  return (
    <ChatInputProvider initialValue={chatInitialValue}>
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 h-14">
        <Link to="/">
          <Logo />
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

          <div className="w-full max-w-2xl">
            <ChatInput
              clearOnSubmit={false}
              onSubmit={handleSubmit}
              submitting={createRepo.isPending || createBranch.isPending}
              minRows={3}
              maxRows={10}
              Textarea={TextareaWithPlaceholder as any}
              disabled={createRepo.isPending || createBranch.isPending}
              extra={
                <RepoSelect
                  disabled={createRepo.isPending || createBranch.isPending}
                />
              }
            />

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <CloneScreenshotAction />
              <Link to="/new/repo">
                <Suggestion suggestion="Import from Github">
                  <SiGithub />
                  Import from Github
                </Suggestion>
              </Link>
            </div>
          </div>
        </section>
        <RecentBranchesGrid />
      </main>
    </ChatInputProvider>
  );
}
