import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { api, useQuery } from "@/hooks/api";
import * as React from "react";
import { RecentBranchesSidebarGroup } from "./groups/recent-branches";
import { ReposSidebarGroup } from "./groups/repos";
import { NavUser } from "./nav-user";
import { OrganizationSwitcher } from "./organization-switcher";

// Move navMainItems inside the component so it can access selectedRepoId

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const repos = useQuery(api.repos.$get, { params: {} });
  const branches = useQuery(api.branches.$get, { params: {} });

  // Get branches for the selected repo
  // const branches = useQuery(api.repos[":repoId"].branches.$get, {
  //   params: { repoId: selectedRepoId || "" },
  //   enabled: !!selectedRepoId,
  // });

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <OrganizationSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <ReposSidebarGroup />
        <RecentBranchesSidebarGroup />
      </SidebarContent>

      <SidebarFooter>
        {/* <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Toggle theme" onClick={toggleTheme}>
              {theme === "light" ? <Sun /> : <Moon />}
              <span>Appearance</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu> */}
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
