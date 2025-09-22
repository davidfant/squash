import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import {
  ChatInput,
  type ChatInputValue,
} from "@/components/layout/chat/input/ChatInput";
import { ChatInputFileUploadsProvider } from "@/components/layout/chat/input/ChatInputFileUploadsContext";
import {
  BranchCard,
  EmptyState,
  FeedHeader,
  GettingStartedCard,
  defaultSuggestions,
} from "@/components/layout/feed";
import { AppSidebar } from "@/components/layout/sidebar/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { api, useMutation, useQuery } from "@/hooks/api";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { FolderGit2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";

interface BranchFeedProps {
  repoId: string;
}

export function BranchFeed({ repoId }: BranchFeedProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterByMe, setFilterByMe] = useState(false);
  const [chatInitialValue, setChatInitialValue] =
    useLocalStorage<ChatInputValue>("BranchFeed.chatInitialValue", {
      text: "",
      files: [],
    });
  const [chatInputKey, setChatInputKey] = useState(0);

  const repos = useQuery(api.repos.$get, { params: {} });
  const selectedRepo = repos.data?.find((repo) => repo.id === repoId);

  const branches = useQuery(api.repos[":repoId"].branches.$get, {
    params: { repoId },
  });

  const createBranch = useMutation(api.repos[":repoId"].branches.$post, {
    onSuccess: (data) => navigate(`/repos/${repoId}/branches/${data.id}`),
  });

  const deleteBranch = useMutation(api.repos.branches[":branchId"].$delete, {
    onSuccess: () => branches.refetch(),
  });

  // Filter branches based on search query
  const filteredBranches = branches.data?.filter((branch) => {
    if (!branch.id) return false;
    const matchesSearch = branch.name
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleSuggestionClick = (prompt: string) => {
    setChatInitialValue({ text: prompt, files: [] });
    setChatInputKey((prev) => prev + 1);
  };

  const handleDeleteBranch = (branchId: string) => {
    deleteBranch.mutate({
      param: { branchId },
    });
  };

  return (
    <SidebarProvider>
      <AppSidebar selectedRepoId={repoId} />
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
                  <BreadcrumbPage>
                    {selectedRepo?.name || "Home"}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="mx-auto max-w-[1000px] p-6">
            {/* Quick Actions */}
            <div className="mt-16 mb-16">
              <ChatInputFileUploadsProvider
                initialValue={chatInitialValue.files.map((f) => ({
                  ...f,
                  id: Math.random().toString(36).substring(2, 15),
                  status: "uploaded" as const,
                }))}
              >
                <ChatInput
                  key={chatInputKey}
                  initialValue={chatInitialValue}
                  clearOnSubmit={false}
                  onSubmit={(content) => {
                    setChatInitialValue({ text: "", files: [] });
                    createBranch.mutate({
                      param: { repoId },
                      json: {
                        message: {
                          parts: [
                            { type: "text", text: content.text },
                            ...content.files,
                          ],
                        },
                      },
                    });
                  }}
                  placeholder="What do you want to build?"
                  submitting={createBranch.isPending}
                  minRows={3}
                  extra={
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
                            <Link key={repo.id} to={`/repos/${repo.id}`}>
                              <DropdownMenuItem
                                className={
                                  repo.id === repoId ? "bg-accent" : ""
                                }
                              >
                                {repo.name}
                              </DropdownMenuItem>
                            </Link>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null
                  }
                />
              </ChatInputFileUploadsProvider>

              <Suggestions>
                {defaultSuggestions.map((s, index) => (
                  <Suggestion
                    key={index}
                    suggestion={s.prompt}
                    onClick={handleSuggestionClick}
                  >
                    {<s.icon className="h-4 w-4" />} {s.text}
                  </Suggestion>
                ))}
              </Suggestions>
            </div>

            {/* Separator */}
            <Separator className="mb-16" />

            {/* Feed Section */}
            <div className="space-y-6">
              {/* Feed Header with Filters */}
              <FeedHeader
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                filterByMe={filterByMe}
                onFilterByMeChange={setFilterByMe}
              />

              {/* Branches List */}
              {!!filteredBranches?.length ? (
                <div className="space-y-4">
                  {filteredBranches.map((branch) => (
                    <BranchCard
                      key={branch.id}
                      branch={branch}
                      onDelete={handleDeleteBranch}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState searchQuery={searchQuery} />
              )}

              {/* Getting Started Section */}
              {(!branches.data || branches.data.length === 0) &&
                !searchQuery && <GettingStartedCard />}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
