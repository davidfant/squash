import { authClient } from "@/auth";
import { CreateOrganizationMenuItem } from "@/components/layout/auth/avatar/CreateOrganizationMenuItem";
import { CurrentUserAvatar } from "@/components/layout/auth/avatar/CurrentUserAvatar";
import {
  ChatInput,
  type ChatInputValue,
} from "@/components/layout/chat/input/ChatInput";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { toast } from "@/components/ui/sonner";
import { api, useMutation, useQuery, type QueryOutput } from "@/hooks/api";
import { cn } from "@/lib/utils";
import { Building2, ChevronDown, Image, Layers, Upload } from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type SVGProps,
} from "react";
import { Link, Navigate, useNavigate } from "react-router";

interface ActionButton {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  onClick: () => void;
  disabled?: boolean;
}

type Branch = QueryOutput<
  (typeof api.repos)[":repoId"]["branches"]["$get"]
>[number];

function OrganizationSwitcher() {
  const session = authClient.useSession();
  const organizations = authClient.useListOrganizations();
  const activeOrganization = authClient.useActiveOrganization();

  const active = activeOrganization.data;

  const setActiveOrganization = async (organizationId: string) => {
    try {
      await authClient.organization.setActive({ organizationId });
    } catch (error) {
      console.error("Failed to set active organization:", error);
      toast.error("Unable to switch organization");
    }
  };

  if (organizations.isPending) {
    return <Skeleton className="h-9 w-32 rounded-full" />;
  }

  if (!active && !session.data?.user) {
    return null;
  }

  const activeName = active?.name ?? session.data?.user?.name ?? "Personal";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-9 rounded-full border border-border/40 bg-background/80 px-3 text-sm font-medium text-foreground/80 hover:bg-background"
        >
          <Building2 className="mr-2 h-4 w-4" />
          <span className="max-w-[160px] truncate text-left">{activeName}</span>
          <ChevronDown className="ml-2 h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="start">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Organizations
        </DropdownMenuLabel>
        {organizations.data?.map((org) => (
          <DropdownMenuItem
            key={org.id}
            className="flex cursor-pointer items-center justify-between"
            onClick={() => setActiveOrganization(org.id)}
          >
            <span className="truncate">{org.name}</span>
            {active?.id === org.id && (
              <span className="text-xs text-primary">Active</span>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <CreateOrganizationMenuItem
          onSuccess={async (organizationId) => {
            await organizations.refetch();
            await setActiveOrganization(organizationId);
          }}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BranchShowcaseCard({ branch }: { branch: Branch }) {
  const updatedAt = useMemo(
    () =>
      new Date(branch.updatedAt).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
      }),
    [branch.updatedAt]
  );

  return (
    <Link
      to={`/repos/${branch.repo.id}/branches/${branch.id}`}
      className="group relative overflow-hidden rounded-2xl border border-border/40 bg-card/70 transition hover:border-primary/40"
    >
      <div className="relative aspect-video w-full bg-muted/70" />
      <div className="p-6">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={branch.createdBy.image ?? undefined} />
            <AvatarFallback>
              {branch.createdBy.name?.charAt(0) ?? branch.repo.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium text-foreground">
              {branch.createdBy.name ?? "Unknown"}
            </p>
            <p className="text-xs text-muted-foreground">Updated {updatedAt}</p>
          </div>
          <div className="ml-auto text-xs text-muted-foreground">
            {branch.repo.name}
          </div>
        </div>
        <Separator className="my-6" />
        <h3 className="text-lg font-semibold">
          {branch.title || branch.name || "Untitled branch"}
        </h3>
      </div>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/80 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
        <span className="text-sm font-medium text-foreground">
          View details
        </span>
      </div>
    </Link>
  );
}

function BranchCardSkeleton() {
  return (
    <div className="h-full rounded-2xl border border-border/30 bg-card/50 p-6">
      <Skeleton className="mb-6 aspect-video w-full rounded-xl" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="mt-6 h-6 w-3/4" />
    </div>
  );
}

function EmptyBranchesState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/40 bg-card/40 p-10 text-center">
      <h3 className="text-lg font-semibold">No branches yet</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Start by describing what you want to build and we will create your first
        branch.
      </p>
      <Button className="mt-6" onClick={onCreate}>
        Start building
      </Button>
    </div>
  );
}

export function NextLandingPage3() {
  const session = authClient.useSession();
  const navigate = useNavigate();
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [chatInitialValue, setChatInitialValue] = useState<ChatInputValue>({
    text: "",
    files: [],
  });
  const [chatInputKey, setChatInputKey] = useState(0);
  const [filePickerTrigger, setFilePickerTrigger] = useState<
    (() => void) | null
  >(null);

  const repos = useQuery(api.repos.$get, {
    params: {},
    enabled: !!session.data?.user,
  });

  useEffect(() => {
    if (!selectedRepoId && repos.data?.length) {
      setSelectedRepoId(repos.data[0]!.id);
    }
  }, [repos.data, selectedRepoId]);

  const selectedRepo = useMemo(
    () => repos.data?.find((repo) => repo.id === selectedRepoId) ?? null,
    [repos.data, selectedRepoId]
  );

  const branches = useQuery(api.repos[":repoId"].branches.$get, {
    params: { repoId: selectedRepoId ?? "" },
    enabled: !!selectedRepoId,
    queryKey: ["next-landing", selectedRepoId],
  });

  const createBranch = useMutation(api.repos[":repoId"].branches.$post, {
    onSuccess: (data) => {
      navigate(`/repos/${selectedRepoId}/branches/${data.id}`);
    },
  });

  if (!session.isPending && !session.data?.user) {
    return <Navigate to="/login" replace />;
  }

  const handleSubmit = (content: ChatInputValue) => {
    if (!selectedRepoId) {
      toast.error("Select a repository to continue");
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
  };

  const handlePrompt = (prompt: string) => {
    setChatInitialValue({ text: prompt, files: [] });
    setChatInputKey((value) => value + 1);
  };

  const actions: ActionButton[] = [
    {
      label: "Clone a screenshot",
      icon: Image,
      onClick: () => {
        if (!filePickerTrigger) {
          toast("Use the attach button to add screenshots.");
          return;
        }
        filePickerTrigger();
      },
      disabled: !selectedRepoId,
    },
    {
      label: "Import from Figma",
      icon: Layers,
      onClick: () =>
        handlePrompt("Import my Figma design and generate the UI."),
      disabled: !selectedRepoId,
    },
    {
      label: "Upload a project brief",
      icon: Upload,
      onClick: () =>
        handlePrompt(
          "Here's the project brief. Plan the tasks and create a new branch."
        ),
      disabled: !selectedRepoId,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/40">
      <header className="sticky top-0 z-10 border-b border-border/40 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="text-lg font-semibold tracking-tight text-foreground"
            >
              Squash
            </Link>
            <OrganizationSwitcher />
          </div>
          <CurrentUserAvatar />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20">
        <section className="flex flex-col items-center py-16 text-center">
          <span className="rounded-full border border-border/40 bg-background/70 px-4 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Next experience
          </span>
          <h1 className="mt-6 max-w-3xl text-balance text-4xl font-semibold leading-tight text-foreground md:text-6xl">
            What do you want to create?
          </h1>
          <p className="mt-4 max-w-2xl text-balance text-lg text-muted-foreground">
            Start building with a single prompt. Attach screenshots, import from
            your design tools, and let Squash handle the rest.
          </p>

          <div className="mt-10 w-full max-w-3xl text-left">
            <ChatInput
              key={chatInputKey}
              initialValue={chatInitialValue}
              submitting={createBranch.isPending}
              placeholder="Describe what you want to build..."
              minRows={3}
              repoPicker={
                repos.data && repos.data.length > 0 ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-9 rounded-full border border-border/40 px-3 text-sm text-muted-foreground"
                      >
                        <Building2 className="mr-2 h-4 w-4" />
                        {selectedRepo?.name ?? "Select repo"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
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
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null
              }
              onSubmit={handleSubmit}
              disabled={!selectedRepoId || createBranch.isPending}
              // onFilePickerReady={(open) =>
              //   setFilePickerTrigger(() => open ?? null)
              // }
            />

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {actions.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  size="sm"
                  className="rounded-full border-border/40 bg-background/70 text-sm"
                  onClick={action.onClick}
                  disabled={action.disabled}
                >
                  <action.icon className="mr-2 h-4 w-4" />
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        </section>

        <section className="pb-12">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Latest branches
              </h2>
              <p className="text-sm text-muted-foreground">
                {selectedRepo
                  ? `Exploring ${selectedRepo.name}`
                  : "Select a repository to explore generated branches."}
              </p>
            </div>
            {selectedRepo && (
              <Button
                variant="link"
                className="px-0 text-sm font-medium text-primary"
                onClick={() => navigate(`/repos/${selectedRepo.id}`)}
              >
                View repository →
              </Button>
            )}
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {branches.isPending &&
              Array.from({ length: 4 }).map((_, index) => (
                <BranchCardSkeleton key={index} />
              ))}

            {!branches.isPending &&
              branches.data?.map((branch) => (
                <BranchShowcaseCard key={branch.id} branch={branch} />
              ))}
          </div>

          {!branches.isPending &&
            (!branches.data || branches.data.length === 0) && (
              <EmptyBranchesState
                onCreate={() => {
                  if (!selectedRepoId) {
                    toast.error("Create a repository to get started");
                    return;
                  }
                  handlePrompt("I want to build a new feature");
                }}
              />
            )}
        </section>
      </main>
    </div>
  );
}
