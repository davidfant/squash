import { authClient } from "@/auth";
import { CurrentUserAvatar } from "@/components/layout/auth/avatar/CurrentUserAvatar";
import { ChatInput } from "@/components/layout/chat/input/ChatInput";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { api, useMutation, useQuery } from "@/hooks/api";
import { cn } from "@/lib/utils";
import {
  Check,
  ChevronsUpDown,
  ImageUp,
  Layers,
  Sparkles,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";

function OrganizationSwitcher() {
  const orgs = authClient.useListOrganizations();
  const activeOrg = authClient.useActiveOrganization();
  const isLoading = orgs.isPending || activeOrg.isPending;

  const setActiveOrganization = async (organizationId: string) => {
    try {
      await authClient.organization.setActive({ organizationId });
      await Promise.all([orgs.refetch(), activeOrg.refetch()]);
    } catch (error) {
      console.error("Failed to set active organization:", error);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-9 w-40" />;
  }

  const organizations = orgs.data ?? [];
  const selected = organizations.find((org) => org.id === activeOrg.data?.id);

  if (!organizations.length) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="inline-flex items-center gap-2 rounded-full border-border/70 bg-card/80 px-4 py-2 text-sm font-medium"
        >
          <span className="truncate max-w-[160px]">
            {selected?.name ?? activeOrg.data?.name ?? "Personal"}
          </span>
          <ChevronsUpDown className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            className="flex items-center gap-2"
            onClick={() => setActiveOrganization(org.id)}
          >
            <span className="truncate">{org.name}</span>
            {activeOrg.data?.id === org.id && (
              <Check className="ml-auto size-4" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface NextBranchCardProps {
  branch: {
    id: string;
    name: string;
    title?: string | null;
    updatedAt: string;
    repo: { id: string; name: string };
    createdBy: { id: string; name: string; image?: string | null };
  };
}

function NextBranchCard({ branch }: NextBranchCardProps) {
  return (
    <Card className="group relative overflow-hidden border border-border/60 bg-card/80 transition-colors hover:border-primary/60">
      <Link
        to={`/repos/${branch.repo.id}/branches/${branch.id}`}
        className="flex h-full flex-col"
      >
        <div className="relative aspect-video w-full bg-muted">
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm font-medium uppercase tracking-wide text-white opacity-0 transition-opacity group-hover:opacity-100">
            View details
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-6 p-6">
          <div className="space-y-2">
            <Badge
              variant="secondary"
              className="rounded-full bg-primary/10 text-primary"
            >
              In progress
            </Badge>
            <h3 className="text-xl font-semibold text-foreground">
              {branch.title?.trim() || branch.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              Explore the latest updates for {branch.repo.name}. Continue
              iterating and keep shipping.
            </p>
          </div>
          <div className="mt-auto flex flex-col gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-3">
              <Avatar className="size-9 border border-border/80">
                <AvatarImage src={branch.createdBy.image ?? undefined} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {branch.createdBy.name?.[0] ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-foreground">
                  {branch.createdBy.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Created this branch
                </p>
              </div>
            </div>
            <Separator />
            <div className="flex flex-wrap items-center gap-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <span className="rounded-full bg-muted px-3 py-1 text-[10px] font-semibold text-muted-foreground">
                {branch.repo.name}
              </span>
              <span>
                Updated{" "}
                {new Date(branch.updatedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </Card>
  );
}

const actionButtons = [
  {
    label: "Clone a screenshot",
    description: "Upload an image and recreate it instantly.",
    icon: ImageUp,
    action: "clone",
  },
  {
    label: "Import from repo",
    description: "Sync an existing project to continue working.",
    icon: Layers,
  },
  {
    label: "Upload a project",
    description: "Bring your own codebase into Squash.",
    icon: Upload,
  },
  {
    label: "Generate with AI",
    description: "Start from a fresh idea using the assistant.",
    icon: Sparkles,
  },
] as const;

export function NextLandingPage2() {
  const session = authClient.useSession();
  const navigate = useNavigate();

  const repos = useQuery(api.repos.$get, { params: {} });
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedRepoId && repos.data?.length) {
      setSelectedRepoId(repos.data[0]!.id);
    }
  }, [repos.data, selectedRepoId]);

  const selectedRepo = useMemo(
    () => repos.data?.find((repo) => repo.id === selectedRepoId),
    [repos.data, selectedRepoId]
  );

  const branches = useQuery(api.repos[":repoId"].branches.$get, {
    params: { repoId: selectedRepoId ?? "" },
    queryKey: ["next-landing", selectedRepoId],
    enabled: !!selectedRepoId,
  });

  const createBranch = useMutation(api.repos[":repoId"].branches.$post, {
    onSuccess: (branch) => {
      if (selectedRepoId) {
        navigate(`/repos/${selectedRepoId}/branches/${branch.id}`);
      }
    },
  });

  const repoPicker = useMemo(() => {
    if (!repos.data?.length) return null;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="rounded-full px-3 text-sm font-medium"
          >
            {selectedRepo?.name ?? "Select repo"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {repos.data.map((repo) => (
            <DropdownMenuItem
              key={repo.id}
              onClick={() => setSelectedRepoId(repo.id)}
              className={cn(
                "cursor-pointer",
                repo.id === selectedRepoId && "bg-accent"
              )}
            >
              {repo.name}
              {repo.id === selectedRepoId && (
                <Check className="ml-auto size-4" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }, [repos.data, selectedRepo?.name, selectedRepoId]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/40">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <div className="text-xl font-semibold">Squash</div>
            <OrganizationSwitcher />
          </div>
          <div className="flex items-center gap-4">
            {session.data?.user && (
              <div className="hidden text-sm text-muted-foreground sm:block">
                {session.data.user.name}
              </div>
            )}
            <CurrentUserAvatar />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 pb-24">
        <section className="py-16 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/80 px-4 py-2 text-sm text-muted-foreground">
            Working in {selectedRepo?.name ?? "your workspace"}
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            What do you want to create?
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Start building with a single prompt—no setup required.
          </p>
          <div className="mt-10">
            <ChatInput
              submitting={createBranch.isPending}
              initialValue={{ text: "", files: [] }}
              placeholder="Describe what you’d like to build"
              minRows={3}
              repoPicker={repoPicker}
              onSubmit={(content) => {
                if (!selectedRepoId) {
                  return;
                }

                createBranch.mutate({
                  param: { repoId: selectedRepoId },
                  json: {
                    message: {
                      parts: [
                        ...(content.text
                          ? [{ type: "text" as const, text: content.text }]
                          : []),
                        ...content.files,
                      ],
                    },
                  },
                });
              }}
            />
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {actionButtons.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                className="h-auto rounded-full border-border/70 bg-background/80 px-5 py-3 text-left text-sm"
                // onClick={() => {
                //   if (action.action === "clone") {
                //     chatInputRef.current?.openFilePicker();
                //   }
                // }}
              >
                <div className="flex items-center gap-3">
                  <action.icon className="size-4" />
                  <div className="text-left">
                    <div className="font-medium text-foreground">
                      {action.label}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {action.description}
                    </div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-2 text-left sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Recent branches
              </h2>
              <p className="text-sm text-muted-foreground">
                Browse everything your team has been crafting lately.
              </p>
            </div>
            {repos.data?.length ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="rounded-full px-3 text-sm"
                  >
                    {selectedRepo?.name ?? "Select repo"}
                    <ChevronsUpDown className="ml-2 size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {repos.data.map((repo) => (
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
            ) : null}
          </div>

          {branches.isPending ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Card
                  key={index}
                  className="border border-border/60 bg-card/80"
                >
                  <Skeleton className="aspect-video w-full" />
                  <div className="space-y-4 p-6">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </Card>
              ))}
            </div>
          ) : branches.data?.length ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {branches.data.map((branch) => (
                <NextBranchCard key={branch.id} branch={branch} />
              ))}
            </div>
          ) : (
            <Card className="border border-dashed border-border/70 bg-background/60 py-16 text-center">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
                <Sparkles className="size-5 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                No branches yet
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Start a conversation above to spin up your first branch, or
                create a repository to begin collaborating.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Button asChild variant="default">
                  <Link to="/new/repo">Create repository</Link>
                </Button>
                <Button
                  variant="outline"
                  // onClick={() => chatInputRef.current?.openFilePicker()}
                  className="rounded-full"
                >
                  Clone a screenshot
                </Button>
              </div>
            </Card>
          )}
        </section>
      </main>
    </div>
  );
}
