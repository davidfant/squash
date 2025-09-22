import { authClient } from "@/auth";
import { Suggestion } from "@/components/ai-elements/suggestion";
import {
  ChatInput,
  type ChatInputValue,
} from "@/components/layout/chat/input/ChatInput";
import { ChatInputFileUploadsProvider } from "@/components/layout/chat/input/ChatInputFileUploadsContext";
import type { ChatInputFile } from "@/components/layout/file/useFileUpload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import { api, useMutation, useQuery, type QueryOutput } from "@/hooks/api";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { CloneScreenshotAction } from "@/routes/next/components/CloneScreenshotAction";
import { SiGithub } from "@icons-pack/react-simple-icons";
import { useQuery as useReactQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { BranchCard } from "./components/BranchCard";
import { HeaderMenu } from "./components/HeaderMenu";
import { RepoSelect } from "./components/RepoSelect";
import { useCurrentRepo } from "./hooks/useCurrentRepo";

type RepoBranchesResult = QueryOutput<
  (typeof api.repos)[":repoId"]["branches"]["$get"]
>;

type BranchSummary = RepoBranchesResult extends Array<infer Item>
  ? Item
  : never;

const SkeletonBranchCard = () => (
  <Card className="pt-0 overflow-hidden">
    <div className="aspect-video w-full bg-muted" />
    <CardContent className="flex items-center gap-3">
      <Skeleton className="size-8 rounded-full" />
      <div className="min-w-0 space-y-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </CardContent>
  </Card>
);

export function NextLandingPage() {
  const session = authClient.useSession();
  const navigate = useNavigate();
  const repos = useQuery(api.repos.$get, { params: {} });
  const { currentRepoId } = useCurrentRepo();

  const [chatInitialValue, setChatInitialValue] =
    useLocalStorage<ChatInputValue>("BranchFeed.chatInitialValue", {
      text: "",
      files: [],
    });
  const [chatInputKey, setChatInputKey] = useState(0);
  const [selectedRepoId, setSelectedRepoId] = useState<string | "all" | null>(
    null
  );

  const repoIds = useMemo(
    () => (repos.data ?? []).map((repo) => repo.id),
    [repos.data]
  );

  // Set default selected repo
  useEffect(() => {
    if (!selectedRepoId && repos.data?.length) {
      setSelectedRepoId("all");
    }
  }, [repos.data, selectedRepoId]);

  const branches = useReactQuery<BranchSummary[]>({
    queryKey: [
      "next-landing-branches",
      selectedRepoId === "all" ? repoIds : [selectedRepoId],
    ],
    enabled:
      (selectedRepoId === "all" && repoIds.length > 0) ||
      (selectedRepoId !== "all" && selectedRepoId !== null),
    queryFn: async () => {
      if (selectedRepoId === "all") {
        if (repoIds.length === 0) return [];
        const responses = await Promise.all(
          repoIds.map((repoId) =>
            api.repos[":repoId"].branches.$get({ param: { repoId } })
          )
        );
        const data = await Promise.all(
          responses.map(async (res) => {
            if (!res.ok) {
              throw new Error(`Failed to load branches (${res.status})`);
            }
            return (await res.json()) as RepoBranchesResult;
          })
        );
        return data
          .flat()
          .sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
      } else if (selectedRepoId) {
        const response = await api.repos[":repoId"].branches.$get({
          param: { repoId: selectedRepoId },
        });
        if (!response.ok) {
          throw new Error(`Failed to load branches (${response.status})`);
        }
        const data = (await response.json()) as RepoBranchesResult;
        return data.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      }
      return [];
    },
  });

  const createBranch = useMutation(api.repos[":repoId"].branches.$post, {
    onSuccess: (data) => {
      if (currentRepoId) {
        navigate(`/repos/${currentRepoId}/branches/${data.id}`);
      }
    },
  });
  const deleteBranch = useMutation(api.repos.branches[":branchId"].$delete, {
    onSuccess: () => branches.refetch(),
  });

  const selectedRepo = useMemo(
    () => repos.data?.find((repo) => repo.id === selectedRepoId) ?? null,
    [repos.data, selectedRepoId]
  );

  const handleSubmit = (content: ChatInputValue) => {
    if (!currentRepoId) {
      toast.error("Select a repository to continue");
      return;
    }

    createBranch.mutate({
      param: { repoId: currentRepoId },
      json: {
        message: {
          parts: [{ type: "text", text: content.text }, ...content.files],
        },
      },
    });

    setChatInitialValue({ text: "", files: [] });
  };

  const handlePrompt = (prompt: string) => {
    setChatInitialValue({ text: prompt, files: [] });
    setChatInputKey((value) => value + 1);
  };

  const handleScreenshotUploaded = (file: ChatInputFile) => {
    setChatInitialValue({
      text: "Clone this screenshot into a working app.",
      files: [],
    });
    setChatInputKey((value) => value + 1);
  };

  if (!session.isPending && !session.data?.user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 h-14">
        <Link to="/" className="flex items-center gap-2">
          <img src="/circle.svg" alt="Squash" className="size-8" /> Squash
        </Link>
        <HeaderMenu />
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 pb-20 pt-16 gap-16">
        <section className="flex flex-col items-center gap-6 text-center">
          <Badge variant="secondary" className="px-3 py-1.5 rounded-full">
            Build anything with AI
          </Badge>
          <h1 className="text-balance text-4xl font-light tracking-tight sm:text-5xl">
            Prototype your next feature
          </h1>
          <p className="max-w-2xl text-balance text-lg text-muted-foreground">
            Start building with a single prompt. Describe your idea and we'll
            spin up a branch, preview, and deployment-ready project for you.
          </p>

          <ChatInputFileUploadsProvider initialValue={chatInitialValue.files}>
            <div className="w-full max-w-2xl">
              <ChatInput
                key={chatInputKey}
                initialValue={chatInitialValue}
                clearOnSubmit={false}
                onSubmit={handleSubmit}
                placeholder="What do you want to build?"
                submitting={createBranch.isPending}
                minRows={3}
                maxRows={10}
                disabled={!currentRepoId || createBranch.isPending}
                extra={
                  <RepoSelect
                    disabled={createBranch.isPending}
                    onScreenshotUploaded={handleScreenshotUploaded}
                  />
                }
              />

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <CloneScreenshotAction
                  onScreenshotUploaded={handleScreenshotUploaded}
                />
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

        <section className="space-y-6">
          <div className="flex gap-3 items-center justify-between">
            <div>
              <h2 className="text-2xl">Recent Prototypes</h2>
              <p className="text-sm text-muted-foreground">
                Explore what your team is building across every repository.
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  {selectedRepoId === "all"
                    ? "All repositories"
                    : selectedRepo?.name ?? "Select repo"}
                  <ChevronsUpDown className="ml-2 size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setSelectedRepoId("all")}>
                  All repositories
                  {selectedRepoId === "all" && (
                    <Check className="ml-auto size-4" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {repos.data?.map((repo) => (
                  <DropdownMenuItem
                    key={repo.id}
                    onClick={() => setSelectedRepoId(repo.id)}
                  >
                    {repo.name}
                    {repo.id === selectedRepoId && (
                      <Check className="ml-auto size-4" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            {branches.isPending
              ? Array.from({ length: 6 }).map((_, index) => (
                  <SkeletonBranchCard key={index} />
                ))
              : branches.data?.map((branch, index) => (
                  <BranchCard
                    key={branch.id}
                    branch={branch}
                    index={index}
                    onDelete={() =>
                      deleteBranch.mutate({ param: { branchId: branch.id } })
                    }
                  />
                ))}
          </div>
        </section>
      </main>
    </>
  );
}
