import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { OrganizationSwitcher } from "@clerk/clerk-react";
import { BoxIcon, LayoutTemplateIcon, Plus } from "lucide-react";
import * as React from "react";
import { Link, useLocation } from "react-router";
import { RecentBranchesSidebarGroup } from "./groups/recent-branches";
import { NavUser } from "./nav-user";

// Move navMainItems inside the component so it can access selectedRepoId

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <OrganizationSwitcher />
          </SidebarMenuItem>
        </SidebarMenu>
        <Link to="/new">
          <Button className="w-full">
            <Plus />
            New App
          </Button>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenuItem>
            <Link to="/apps">
              <SidebarMenuButton
                isActive={location.pathname.startsWith("/apps")}
              >
                <BoxIcon />
                Apps
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link to="/templates">
              <SidebarMenuButton
                isActive={location.pathname.startsWith("/template")}
              >
                <LayoutTemplateIcon />
                Templates
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarGroup>

        {/* <ReposSidebarGroup /> */}
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
