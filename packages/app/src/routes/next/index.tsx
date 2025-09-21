import { authClient } from "@/auth";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import {
  ChatInput,
  type ChatInputValue,
} from "@/components/layout/chat/input/ChatInput";
import { defaultSuggestions } from "@/components/layout/feed";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/contexts/ThemeContext";
import { api, useQuery, type QueryOutput } from "@/hooks/api";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useQuery as useReactQuery } from "@tanstack/react-query";
import {
  ArrowUp,
  ArrowUpRight,
  Camera,
  Check,
  FileText,
  Loader2,
  LogOut,
  Moon,
  Palette,
  Plus,
  Sparkles,
  Sun,
  Upload,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router";

const RELATIVE_TIME_DIVISIONS: {
  amount: number;
  name: Intl.RelativeTimeFormatUnit;
}[] = [
  { amount: 60, name: "second" },
  { amount: 60, name: "minute" },
  { amount: 24, name: "hour" },
  { amount: 7, name: "day" },
  { amount: 4.34524, name: "week" },
  { amount: 12, name: "month" },
  { amount: Number.POSITIVE_INFINITY, name: "year" },
];

function formatRelativeTime(input: string) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  let duration = (date.getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  for (const division of RELATIVE_TIME_DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return rtf.format(Math.round(duration), division.name);
    }
    duration /= division.amount;
  }

  return "";
}

type RepoBranchesResult = QueryOutput<
  (typeof api.repos)[":repoId"]["branches"]["$get"]
>;

type BranchSummary = RepoBranchesResult extends Array<infer Item>
  ? Item
  : never;

function OrganizationSwitcher() {
  const orgs = authClient.useListOrganizations();
  const activeOrg = authClient.useActiveOrganization();
  const session = authClient.useSession();

  const [isSwitching, setIsSwitching] = useState(false);

  const organizations = orgs.data ?? [];
  const active = activeOrg.data;
  const fallbackName = session.data?.user?.name ?? "Personal";
  const activeName = active?.name ?? fallbackName;
  const activeInitials = activeName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSelect = async (organizationId: string) => {
    if (organizationId === active?.id) return;
    try {
      setIsSwitching(true);
      await authClient.organization.setActive({ organizationId });
      await Promise.all([orgs.refetch(), activeOrg.refetch()]);
    } catch (error) {
      console.error("Failed to switch organization", error);
    } finally {
      setIsSwitching(false);
    }
  };

  if (!session.data?.user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-3 rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-sm font-medium shadow-sm transition hover:border-primary/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
          <div className="flex size-8 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground/80">
            {active?.logo ? (
              <img
                src={active.logo}
                alt={activeName}
                className="size-full rounded-full object-cover"
              />
            ) : (
              activeInitials || "OR"
            )}
          </div>
          <div className="flex flex-col text-left leading-tight">
            <span className="text-xs text-muted-foreground">Organization</span>
            <span>{activeName}</span>
          </div>
          {isSwitching ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : (
            <ArrowUp className="size-3 rotate-90 text-muted-foreground" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-64 rounded-xl border-border/80 bg-background/95 backdrop-blur"
      >
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Switch organization
        </DropdownMenuLabel>
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => handleSelect(org.id)}
            className="flex items-center gap-3 rounded-lg px-3 py-2"
          >
            <div className="flex size-7 items-center justify-center rounded-md border border-border/60 bg-muted text-xs font-semibold">
              {org.name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "OR"}
            </div>
            <span className="flex-1 text-sm">{org.name}</span>
            {active?.id === org.id && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2 px-3 py-2 text-sm text-muted-foreground"
          disabled
        >
          <Plus className="size-4" />
          Create organization
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu() {
  const session = authClient.useSession();
  const { theme, toggleTheme } = useTheme();

  if (!session.data?.user) {
    return null;
  }

  const { user } = session.data;
  const initials = (user.name ?? user.email ?? "U").slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-3 rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-sm font-medium shadow-sm transition hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
          <Avatar className="size-8">
            <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
            <AvatarFallback className="bg-primary/10 font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden text-left leading-tight sm:flex sm:flex-col">
            <span className="text-xs text-muted-foreground">Logged in as</span>
            <span className="truncate text-sm font-medium">
              {user.name ?? user.email}
            </span>
          </div>
          <ArrowUp className="size-3 rotate-90 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-56 rounded-xl border-border/80 bg-background/95 backdrop-blur"
      >
        <DropdownMenuLabel className="flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
            <AvatarFallback className="bg-primary/10 font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">{user.name ?? "User"}</span>
            <span className="text-xs text-muted-foreground">{user.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={toggleTheme}
          className="gap-2 px-3 py-2 text-sm"
        >
          {theme === "dark" ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
          <span>Switch to {theme === "dark" ? "light" : "dark"} theme</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled
          className="gap-2 px-3 py-2 text-sm text-muted-foreground"
        >
          <Palette className="size-4" />
          Theme presets (coming soon)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => authClient.signOut()}
          className="gap-2 px-3 py-2 text-sm"
        >
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface Attachment {
  id: string;
  file: File;
}

export function NextLandingPage() {
  const session = authClient.useSession();
  const repos = useQuery(api.repos.$get, { params: {} });

  const [chatInitialValue, setChatInitialValue] =
    useLocalStorage<ChatInputValue>("BranchFeed.chatInitialValue", {
      text: "",
      files: [],
    });
  const [chatInputKey, setChatInputKey] = useState(0);

  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const repoIds = useMemo(
    () => (repos.data ?? []).map((repo) => repo.id),
    [repos.data]
  );

  const branches = useReactQuery<BranchSummary[]>({
    queryKey: ["next-landing-branches", repoIds],
    enabled: repoIds.length > 0,
    queryFn: async () => {
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
    },
  });

  const hasRepos = repoIds.length > 0;
  const primaryRepoLink = hasRepos ? `/repos/${repoIds[0]!}` : "/new/repo";
  const primaryRepoLabel = hasRepos
    ? "Open your latest repository"
    : "Create a repository";

  const handleScreenshotClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;
    const newAttachments = Array.from(files).map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random()
        .toString(36)
        .slice(2)}`,
      file,
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
    event.target.value = "";
  };

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const actionButtons = useMemo(
    () => [
      {
        label: "Clone a screenshot",
        icon: Camera,
        onClick: handleScreenshotClick,
      },
      {
        label: "Import from Figma",
        icon: FileText,
      },
      {
        label: "Upload a project",
        icon: Upload,
      },
    ],
    [handleScreenshotClick]
  );

  // const createBranch = useMutation(api.repos[":repoId"].branches.$post, {
  //   onSuccess: (data) => navigate(`/repos/${repoId}/branches/${data.id}`),
  // });

  if (!session.isPending && !session.data?.user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(147,51,234,0.06),_transparent_50%)] text-foreground">
      <header className="border-b border-border/60 bg-background/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center rounded-full bg-primary/10 p-2 transition hover:bg-primary/20"
            >
              <img src="/circle.svg" alt="Squash" className="size-8" />
            </Link>
            <OrganizationSwitcher />
          </div>
          <UserMenu />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-6 pb-20 pt-16">
        <section className="flex flex-col items-center gap-6 text-center">
          <Badge
            variant="secondary"
            className="rounded-full border border-border/70 bg-background/60 px-4 py-2 text-sm"
          >
            Introducing the next Squash workspace
          </Badge>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            What do you want to create?
          </h1>
          <p className="max-w-2xl text-balance text-lg text-muted-foreground">
            Start building with a single prompt. Describe your idea and we'll
            spin up a branch, preview, and deployment-ready project for you.
          </p>

          <div className="mt-16 mb-16">
            <ChatInput
              key={chatInputKey}
              initialValue={chatInitialValue}
              clearOnSubmit={false}
              onSubmit={(content) => {
                setChatInitialValue({ text: "", files: [] });
                // createBranch.mutate({
                //   param: { repoId },
                //   json: {
                //     message: {
                //       parts: [
                //         { type: "text", text: content.text },
                //         ...content.files,
                //       ],
                //     },
                //   },
                // });
              }}
              placeholder="What do you want to build?"
              // submitting={createBranch.isPending}
              minRows={3}
              // repoPicker={
              //   repos.data && repos.data.length > 0 ? (
              //     <DropdownMenu>
              //       <DropdownMenuTrigger asChild>
              //         <Button
              //           variant="ghost"
              //           className="rounded-full text-muted-foreground h-auto px-3"
              //         >
              //           <FolderGit2 className="h-4 w-4 mr-2" />
              //           {selectedRepo?.name || "Select repo"}
              //         </Button>
              //       </DropdownMenuTrigger>
              //       <DropdownMenuContent align="start">
              //         {repos.data.map((repo) => (
              //           <Link key={repo.id} to={`/repos/${repo.id}`}>
              //             <DropdownMenuItem
              //               className={repo.id === repoId ? "bg-accent" : ""}
              //             >
              //               {repo.name}
              //             </DropdownMenuItem>
              //           </Link>
              //         ))}
              //       </DropdownMenuContent>
              //     </DropdownMenu>
              //   ) : null
              // }
            />

            <Suggestions>
              {defaultSuggestions.map((s, index) => (
                <Suggestion
                  key={index}
                  suggestion={s.prompt}
                  // onClick={handleSuggestionClick}
                >
                  {<s.icon className="h-4 w-4" />} {s.text}
                </Suggestion>
              ))}
            </Suggestions>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Recent branches
              </h2>
              <p className="text-sm text-muted-foreground">
                Explore what your team is building across every repository.
              </p>
            </div>
            <Button variant="ghost" className="w-fit px-3">
              <Link
                to={primaryRepoLink}
                className="flex items-center gap-2 text-sm"
              >
                {primaryRepoLabel}
                <ArrowUpRight className="size-4" />
              </Link>
            </Button>
          </div>

          {branches.isPending ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-64 animate-pulse rounded-2xl border border-border/60 bg-muted/30"
                />
              ))}
            </div>
          ) : branches.data && branches.data.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {branches.data.map((branch) => {
                const relativeUpdated = formatRelativeTime(branch.updatedAt);
                const normalizedUpdated = relativeUpdated
                  ? relativeUpdated.startsWith("in ")
                    ? relativeUpdated.replace("in ", "")
                    : relativeUpdated
                  : "moments ago";

                return (
                  <Link
                    key={branch.id}
                    to={`/branches/${branch.id}`}
                    className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-background/80 shadow-sm transition hover:-translate-y-1 hover:shadow-2xl"
                  >
                    <div className="aspect-video w-full bg-muted/60" />
                    <div className="flex flex-1 flex-col gap-5 px-5 pb-5 pt-4">
                      <div className="space-y-2">
                        <Badge
                          variant="outline"
                          className="rounded-full border-border/70 px-3 py-0.5 text-xs"
                        >
                          {branch.repo.name}
                        </Badge>
                        <h3 className="text-lg font-semibold leading-snug text-foreground">
                          {branch.title || branch.name || "Untitled branch"}
                        </h3>
                      </div>
                      <div className="mt-auto flex items-center justify-between text-sm text-muted-foreground">
                        <span>{relativeUpdated || "moments ago"}</span>
                        <span className="truncate">
                          By {branch.createdBy.name ?? "Unknown user"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9">
                          <AvatarImage
                            src={branch.createdBy.image ?? undefined}
                            alt={branch.createdBy.name ?? ""}
                          />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {branch.createdBy.name?.charAt(0) ?? "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {branch.createdBy.name ?? "Unknown user"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            Updated {normalizedUpdated}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center">
                      <div className="translate-y-4 rounded-full bg-primary px-4 py-1 text-sm font-medium text-primary-foreground opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
                        View details
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-10 text-center">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Sparkles className="size-7" />
              </div>
              <h3 className="mt-6 text-xl font-semibold">No branches yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Generate something above to create your first branch.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
