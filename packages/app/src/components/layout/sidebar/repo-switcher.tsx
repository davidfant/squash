import * as React from "react";
import { ChevronsUpDown, Plus, GitBranch, Trash2, MoreHorizontal } from "lucide-react";
import { useNavigate } from "react-router";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useSelectedRepoId } from "@/routes/landing";
import { api, useMutation } from "@/hooks/api";
import { Button } from "@/components/ui/button";

interface Repo {
  id: string;
  name: string;
}

export function RepoSwitcher({
  repos,
}: {
  repos: Repo[];
}) {
  const { isMobile } = useSidebar();
  const [selectedRepoId, setSelectedRepoId] = useSelectedRepoId();
  const navigate = useNavigate();
  
  const activeRepo = repos.find(repo => repo.id === selectedRepoId) || repos[0];

  // @ts-ignore - Delete endpoint was just added to the API, types need to be updated
  const deleteRepo = useMutation(api.repos[":repoId"].$delete, {
    onSuccess: (_, variables) => {
      // After deletion, if it's the selected repo, select another one
      const deletedRepoId = variables.param.repoId;
      if (deletedRepoId === selectedRepoId && repos.length > 1) {
        const remainingRepos = repos.filter(r => r.id !== deletedRepoId);
        setSelectedRepoId(remainingRepos[0]?.id || '');
      }
      // Refresh the page to update the repos list
      window.location.reload();
    },
  });

  const handleDeleteRepo = (repoId: string) => {
    if (confirm("Are you sure you want to remove this repository? This action cannot be undone.")) {
      deleteRepo.mutate({
        param: { repoId },
      });
    }
  };

  if (!activeRepo || repos.length === 0) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            onClick={() => navigate("/new/repo")}
            className="w-full"
          >
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
              <Plus className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">Add Repository</span>
              <span className="truncate text-xs text-muted-foreground">Import from GitHub</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <GitBranch className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{activeRepo.name}</span>
                <span className="truncate text-xs text-muted-foreground">Repository</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Repositories
            </DropdownMenuLabel>
            {repos.map((repo, index) => (
              <div key={repo.id} className="relative group">
                <DropdownMenuItem
                  onClick={() => setSelectedRepoId(repo.id)}
                  className="gap-2 p-2 pr-8"
                >
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    <GitBranch className="size-3.5 shrink-0" />
                  </div>
                  <span className="flex-1">{repo.name}</span>
                  <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                </DropdownMenuItem>
                
                {/* Delete button */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" side="right">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRepo(repo.id);
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove repository
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="gap-2 p-2"
              onClick={() => navigate("/new/repo")}
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium">Add repository</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
} 