import { authClient } from "@/auth";
import { Suggestion } from "@/components/ai-elements/suggestion";
import { CreateOrganizationMenuItem } from "@/components/layout/auth/avatar/CreateOrganizationMenuItem";
import {
  ChatInput,
  type ChatInputValue,
} from "@/components/layout/chat/input/ChatInput";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/sonner";
import { useTheme } from "@/contexts/ThemeContext";
import { api, useMutation, useQuery, type QueryOutput } from "@/hooks/api";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { SiGithub } from "@icons-pack/react-simple-icons";
import { useQuery as useReactQuery } from "@tanstack/react-query";
import {
  Check,
  ChevronsUpDown,
  ImageUp,
  LogOut,
  Moon,
  Sun,
  Upload,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type SVGProps,
} from "react";
import { Link, Navigate, useNavigate } from "react-router";

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

interface ActionButton {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  onClick: () => void;
  disabled?: boolean;
}

const AvatarComponent = ({
  image,
  name,
  className,
}: {
  image: string;
  name: string;
  className: string;
}) => (
  <Avatar className={className}>
    <AvatarImage src={image} alt={name} />
    <AvatarFallback>{name.charAt(0)}</AvatarFallback>
  </Avatar>
);

function CombinedHeaderMenu() {
  const orgs = authClient.useListOrganizations();
  const activeOrg = authClient.useActiveOrganization();
  const session = authClient.useSession();
  const { theme, toggleTheme } = useTheme();

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
      toast.error("Unable to switch organization");
    } finally {
      setIsSwitching(false);
    }
  };

  if (!session.data?.user) {
    return null;
  }

  const { user } = session.data;
  const userInitials = (user.name ?? user.email ?? "U")
    .slice(0, 2)
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" disabled={isSwitching} className="gap-2 px-2">
          <AvatarComponent
            image={active?.logo ?? ""}
            name={activeName}
            className="size-8"
          />
          <span>{activeName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 rounded-xl border-border/80 bg-background/95 backdrop-blur"
      >
        {/* Active org and user info header */}
        <DropdownMenuLabel className="flex flex-col gap-2 p-3">
          <div className="flex items-center gap-3">
            <AvatarComponent
              image={active?.logo ?? ""}
              name={activeName}
              className="size-8"
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold">{activeName}</span>
              <span className="text-xs text-muted-foreground">
                {user.email}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Organizations group */}
        <DropdownMenuLabel className="text-xs text-muted-foreground px-3 py-2">
          Organizations
        </DropdownMenuLabel>
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => handleSelect(org.id)}
            className="flex items-center gap-3"
          >
            <AvatarComponent
              image={org.logo ?? ""}
              name={org.name}
              className="size-6"
            />
            <span className="flex-1 text-sm">{org.name}</span>
            {active?.id === org.id && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}
        <CreateOrganizationMenuItem
          onSuccess={async (organizationId) => {
            await orgs.refetch();
            await handleSelect(organizationId);
          }}
        />

        <DropdownMenuSeparator />

        {/* Theme and sign out group */}
        <DropdownMenuItem onClick={toggleTheme} className="gap-2">
          {theme === "dark" ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
          <span>Switch to {theme === "dark" ? "light" : "dark"} theme</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => authClient.signOut()}
          className="gap-2"
        >
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BranchCard({ branch }: { branch: BranchSummary }) {
  const relativeUpdated = formatRelativeTime(branch.updatedAt);
  const normalizedUpdated = relativeUpdated
    ? relativeUpdated.startsWith("in ")
      ? relativeUpdated.replace("in ", "")
      : relativeUpdated
    : "moments ago";

  const formattedDate = new Date(branch.updatedAt).toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
    }
  );

  return (
    <Link to={`/branches/${branch.id}`}>
      <Card className="pt-0 overflow-hidden">
        <div className="aspect-video w-full bg-muted" />
        <CardContent className="flex items-center gap-3">
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

export function NextLandingPage4() {
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

  const actions: ActionButton[] = [
    {
      label: "Clone a screenshot",
      icon: ImageUp,
      onClick: () => handlePrompt("Clone this screenshot into a working app."),
    },
    {
      label: "Import from Github",
      icon: SiGithub,
      onClick: () =>
        handlePrompt("Import my Github repository and generate the UI."),
    },
    {
      label: "Upload a project",
      icon: Upload,
      onClick: () =>
        handlePrompt("Upload my existing project and help me improve it."),
    },
  ];

  if (!session.isPending && !session.data?.user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2">
        <Link to="/" className="flex items-center gap-2">
          <img src="/circle.svg" alt="Squash" className="size-8" /> Squash
        </Link>
        <CombinedHeaderMenu />
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
              {actions.map((action) => (
                <Suggestion
                  key={action.label}
                  suggestion={action.label}
                  size="default"
                  onClick={action.onClick}
                >
                  <action.icon className="size-4" />
                  <span className="font-medium text-foreground">
                    {action.label}
                  </span>
                </Suggestion>
              ))}
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
              ? Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-64 animate-pulse rounded-2xl border border-border/60 bg-muted/30"
                  />
                ))
              : branches.data?.map((branch) => (
                  <BranchCard key={branch.id} branch={branch} />
                ))}
          </div>
          {/* // {(
          //   <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-10 text-center">
          //     <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
          //       <Sparkles className="size-7" />
          //     </div>
          //     <h3 className="mt-6 text-xl font-semibold">No branches yet</h3>
          //     <p className="mt-2 text-sm text-muted-foreground">
          //       Generate something above to create your first branch.
          //     </p>
          //   </div>
          // )} */}
        </section>
      </main>
    </>
  );
}
