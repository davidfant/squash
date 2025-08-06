import {
  ChatInput,
  type ChatInputValue,
} from "@/components/layout/chat/input/ChatInput";
import { AppSidebar } from "@/components/layout/sidebar/app-sidebar";
import {
  BranchCard,
  EmptyState,
  FeedHeader,
  GettingStartedCard,
  SuggestionPills,
  defaultSuggestions,
} from "@/components/layout/feed";
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
import { FolderGit2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useSelectedRepoId } from "../landing";

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
              <SuggestionPills
                suggestions={defaultSuggestions}
                onSuggestionClick={handleSuggestionClick}
              />
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
              {filteredBranches && filteredBranches.length > 0 ? (
                <div className="space-y-4">
                  {filteredBranches
                    .filter(
                      (branch): branch is typeof branch & { id: string } =>
                        !!branch.id
                    )
                    .map((branch) => (
                      <BranchCard
                        key={branch.id}
                        branch={branch}
                        repoName={selectedRepo?.name}
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
