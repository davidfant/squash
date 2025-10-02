import { authClient } from "@/auth/client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useTheme } from "@/contexts/ThemeContext";
import { api, useQuery } from "@/hooks/api";
import { GitBranch, Home, Moon, Settings, Sun } from "lucide-react";
import * as React from "react";
import { Link } from "react-router";
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";
import { RepoSwitcher } from "./repo-switcher";

// Move navMainItems inside the component so it can access selectedRepoId

export function AppSidebar({
  selectedRepoId,
  ...props
}: { selectedRepoId: string } & React.ComponentProps<typeof Sidebar>) {
  const session = authClient.useSession();

  const repos = useQuery(api.repos.$get, { params: {} });
  const navMainItems = [
    {
      title: "Home",
      url: selectedRepoId ? `/repos/${selectedRepoId}` : "/",
      icon: Home,
      isActive: true,
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings,
      items: [
        { title: "General", url: "#" },
        { title: "Integrations", url: "#" },
      ],
    },
  ];

  // Get branches for the selected repo
  const branches = useQuery(api.repos[":repoId"].branches.$get, {
    params: { repoId: selectedRepoId || "" },
    enabled: !!selectedRepoId,
  });

  const userData = session.data?.user
    ? {
        name: session.data.user.name || "User",
        email: session.data.user.email || "",
        avatar: session.data.user.image || "",
      }
    : null;

  const { theme, toggleTheme } = useTheme();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {repos.data && (
          <RepoSwitcher
            selectedId={selectedRepoId}
            repos={repos.data.map((repo) => ({
              id: repo.id,
              name: repo.name,
            }))}
          />
        )}
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainItems} />

        {/* Branches Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Branches</SidebarGroupLabel>

          {selectedRepoId && branches.data ? (
            <SidebarMenu>
              {branches.data.length > 0 ? (
                branches.data
                  .filter(
                    (branch): branch is NonNullable<typeof branch> =>
                      branch != null && branch.id != null && branch.name != null
                  )
                  .map((branch) => (
                    <SidebarMenuItem key={branch.id}>
                      <SidebarMenuButton asChild>
                        <Link to={`/branches/${branch.id}`}>
                          <GitBranch className="h-4 w-4" />
                          <span>{branch.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))
              ) : (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  No branches yet
                </div>
              )}
            </SidebarMenu>
          ) : !selectedRepoId ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Select a repository to view branches
            </div>
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Loading branches...
            </div>
          )}
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Toggle theme" onClick={toggleTheme}>
              {theme === "light" ? <Sun /> : <Moon />}
              <span>Appearance</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {userData && <NavUser user={userData} />}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
