import {
  ChatInput,
  type ChatInputValue,
} from "@/components/layout/chat/input/ChatInput";
import { AppSidebar } from "@/components/layout/sidebar/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { api, useMutation, useQuery } from "@/hooks/api";
import {
  Bug,
  Filter,
  FolderGit2,
  GitBranch,
  MapPin,
  MoreHorizontal,
  Palette,
  Search,
  Sparkles,
  Trash2,
  User,
  Zap,
} from "lucide-react";
import { useState, type ElementType } from "react";
import { Link, useNavigate } from "react-router";
import { useSelectedRepoId } from "../landing";

interface Suggestion {
  text: string;
  icon: ElementType;
  prompt: string;
}

export function BranchFeed() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterByMe, setFilterByMe] = useState(false);
  // const [chatInitialValue, setChatInitialValue] =
  //   useLocalStorage<ChatInputValue>("BranchFeed.chatInitialValue", {
  //     text: "",
  //     files: [],
  //   });
  const [chatInitialValue, setChatInitialValue] = useState<ChatInputValue>({
    text: "",
    files: [],
  });
  const [chatInputKey, setChatInputKey] = useState(0);
  const [selectedRepoId, setSelectedRepoId] = useSelectedRepoId();

  const repos = useQuery(api.repos.$get, { params: {} });
  const selectedRepo = repos.data?.find((repo) => repo.id === selectedRepoId);

  const branches = useQuery(api.repos[":repoId"].branches.$get, {
    params: { repoId: selectedRepoId || "" },
    enabled: !!selectedRepoId,
  });

  const createBranch = useMutation(api.repos[":repoId"].branches.$post, {
    onSuccess: (data) => navigate(`/branches/${data.id}`),
  });

  const deleteBranch = useMutation(api.repos.branches[":branchId"].$delete, {
    onSuccess: () => branches.refetch(),
  });

  // Suggestions for non-technical users with example prompts
  const suggestions: Suggestion[] = [
    {
      text: "Build a feature",
      icon: Sparkles,
      prompt: "Help me create a feature that...",
    },
    {
      text: "Fix a bug",
      icon: Bug,
      prompt: "Help me fix a bug where...",
    },
    {
      text: "Update design",
      icon: Palette,
      prompt: "Help me update the design to...",
    },
    {
      text: "Improve performance",
      icon: Zap,
      prompt: "Help me improve performance by...",
    },
  ];

  // Filter branches based on search query
  const filteredBranches = branches.data?.filter((branch) => {
    if (!branch.id) return false;
    const matchesSearch = branch.name
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>Home</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="mx-auto max-w-[1000px] p-6">
            {/* Quick Actions */}
            <div className="mt-16 mb-16">
              <ChatInput
                key={chatInputKey}
                initialValue={chatInitialValue}
                onSubmit={(content) => {
                  setChatInitialValue({ text: "", files: [] });
                  if (selectedRepoId) {
                    createBranch.mutate({
                      param: { repoId: selectedRepoId },
                      json: {
                        message: {
                          parts: [
                            { type: "text", text: content.text },
                            ...content.files,
                          ],
                        },
                      },
                    });
                  }
                }}
                placeholder="What do you want to build?"
                submitting={createBranch.isPending}
                minRows={3}
                repoPicker={
                  repos.data && repos.data.length > 0 ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="rounded-full text-muted-foreground h-auto px-3"
                        >
                          <FolderGit2 className="h-4 w-4 mr-2" />
                          {selectedRepo?.name || "Select repo"}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {repos.data.map((repo) => (
                          <DropdownMenuItem
                            key={repo.id}
                            onClick={() => setSelectedRepoId(repo.id)}
                            className={
                              repo.id === selectedRepoId ? "bg-accent" : ""
                            }
                          >
                            {repo.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null
                }
              />

              {/* Suggestion Pills */}
              <div className="flex flex-wrap gap-3 mt-4">
                {suggestions.map((s) => (
                  <Button
                    key={s.text}
                    variant="outline"
                    size="default"
                    className="h-10 px-5 gap-2.5 font-normal text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setChatInitialValue({ text: s.prompt, files: [] });
                      setChatInputKey((prev) => prev + 1);
                    }}
                  >
                    <s.icon className="h-4 w-4" />
                    {s.text}
                  </Button>
                ))}
              </div>
            </div>

            {/* Separator */}
            <Separator className="mb-16" />

            {/* Feed Section */}
            <div className="space-y-6">
              {/* Feed Header with Filters */}
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold">Feed</h2>

                <div className="flex items-center gap-2">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search branches..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-[200px] h-9"
                    />
                  </div>

                  {/* Filter Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9">
                        <Filter className="h-3.5 w-3.5 mr-2" />
                        Filter
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Filter by</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuCheckboxItem
                        checked={filterByMe}
                        onCheckedChange={setFilterByMe}
                      >
                        Created by me
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem>
                        Recent activity
                      </DropdownMenuCheckboxItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Branches List */}
              {filteredBranches && filteredBranches.length > 0 ? (
                <div className="space-y-4">
                  {filteredBranches
                    .filter(
                      (branch): branch is typeof branch & { id: string } =>
                        !!branch.id
                    )
                    .map((branch) => (
                      <Card
                        key={branch.id}
                        className="group relative border border-border/50 bg-card hover:bg-accent/5 transition-colors shadow-none overflow-hidden py-0"
                      >
                        <Link to={`/branches/${branch.id}`} className="flex">
                          {/* Screenshot Placeholder - Full Height */}
                          <div className="shrink-0 w-80 bg-muted" />

                          {/* Content */}
                          <div className="flex-1 px-6 py-4">
                            <div className="mb-3">
                              {/* Status Badge */}
                              <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary mb-3">
                                In progress
                              </div>

                              {/* Title */}
                              <h3 className="font-semibold text-lg truncate">
                                {(branch as any).title || branch.name}
                              </h3>

                              {/* Description */}
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                A modern web application with responsive design
                                and real-time features. Built with the latest
                                technologies for optimal performance.
                              </p>
                            </div>

                            {/* Separator */}
                            <div className="border-t border-border/50 mb-3" />

                            {/* Metadata */}
                            <div className="flex items-center gap-2 text-xs overflow-x-auto whitespace-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] -mx-2 px-2">
                              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 shrink-0">
                                <GitBranch className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground truncate max-w-[200px]">
                                  {branch.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 shrink-0">
                                <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground truncate max-w-[200px]">
                                  {selectedRepo?.name || "Repository"}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 shrink-0">
                                <User className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground truncate max-w-[200px]">
                                  {branch.createdBy?.name || "Unknown"}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 shrink-0">
                                <span className="text-muted-foreground whitespace-nowrap">
                                  Updated{" "}
                                  {branch.updatedAt
                                    ? new Date(
                                        branch.updatedAt
                                      ).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                      })
                                    : "recently"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Hover Actions */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-4 right-4 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteBranch.mutate({
                                    param: { branchId: branch.id },
                                  });
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete branch
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </Link>
                      </Card>
                    ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground">
                    {searchQuery
                      ? "No branches found matching your search."
                      : "No branches yet. Start by creating your first branch above."}
                  </p>
                </div>
              )}

              {/* Getting Started Section */}
              {(!branches.data || branches.data.length === 0) &&
                !searchQuery && (
                  <Card className="border-dashed border-border/50 bg-muted/20 p-6 mt-8 shadow-none">
                    <h3 className="font-medium text-sm mb-3">
                      Getting started
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium text-sm mb-1">
                          Create your first branch
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Describe what you want to build in the input above,
                          and hypershape will help you create it.
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm mb-1">
                          Explore templates
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Browse our collection of templates to get started
                          quickly.
                        </p>
                      </div>
                    </div>
                  </Card>
                )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
