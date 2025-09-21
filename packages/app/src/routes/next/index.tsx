import { authClient } from "@/auth";
import { Suggestion } from "@/components/ai-elements/suggestion";
import {
  ChatInput,
  type ChatInputValue,
} from "@/components/layout/chat/input/ChatInput";
import type { ChatInputFile } from "@/components/layout/file/useFileUpload";
import { Avatar } from "@/components/ui/avatar";
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
import { CloneScreenshotAction } from "@/routes/next/CloneScreenshotAction";
import { SiGithub } from "@icons-pack/react-simple-icons";
import { useQuery as useReactQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { HeaderMenu } from "./HeaderMenu";

type RepoBranchesResult = QueryOutput<
  (typeof api.repos)[":repoId"]["branches"]["$get"]
>;

type BranchSummary = RepoBranchesResult extends Array<infer Item>
  ? Item
  : never;

function BranchCard({ branch }: { branch: BranchSummary }) {
  const formattedDate = new Date(branch.updatedAt).toLocaleDateString(
    undefined,
    { month: "short", day: "numeric" }
  );

  return (
    <Link to={`/branches/${branch.id}`}>
      <Card className="pt-0 overflow-hidden">
        <div className="aspect-video w-full bg-muted" />
        <CardContent className="flex items-center gap-3">
          <Avatar
            image={branch.createdBy.image ?? ""}
            name={branch.createdBy.name ?? ""}
            className="size-8"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{branch.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {formattedDate} • {branch.createdBy.name}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

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
      if (selectedRepoId && selectedRepoId !== "all") {
        navigate(`/repos/${selectedRepoId}/branches/${data.id}`);
      }
    },
  });

  const selectedRepo = useMemo(
    () => repos.data?.find((repo) => repo.id === selectedRepoId) ?? null,
    [repos.data, selectedRepoId]
  );

  const handleSubmit = (content: ChatInputValue) => {
    if (!selectedRepoId || selectedRepoId === "all") {
      toast.error("Select a specific repository to continue");
      return;
    }

    createBranch.mutate({
      param: { repoId: selectedRepoId },
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
      files: [file],
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

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 pb-20 pt-16">
        <section className="flex flex-col items-center gap-6 text-center">
          <Badge variant="secondary" className="px-3 py-1.5 rounded-full">
            Build anything with AI
          </Badge>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            What do you want to create?
          </h1>
          <p className="max-w-2xl text-balance text-lg text-muted-foreground">
            Start building with a single prompt. Describe your idea and we'll
            spin up a branch, preview, and deployment-ready project for you.
          </p>

          <div className="mt-16 mb-16 w-full max-w-3xl">
            <ChatInput
              key={chatInputKey}
              initialValue={chatInitialValue}
              clearOnSubmit={false}
              onSubmit={handleSubmit}
              placeholder="What do you want to build?"
              submitting={createBranch.isPending}
              minRows={3}
              disabled={
                !selectedRepoId ||
                selectedRepoId === "all" ||
                createBranch.isPending
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
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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

          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {branches.isPending
              ? Array.from({ length: 6 }).map((_, index) => (
                  <SkeletonBranchCard key={index} />
                ))
              : branches.data?.map((branch) => (
                  <BranchCard key={branch.id} branch={branch} />
                ))}
          </div>
        </section>
      </main>
    </>
  );
}
