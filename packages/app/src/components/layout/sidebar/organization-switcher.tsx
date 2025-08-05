import * as React from "react";
import { ChevronsUpDown, Plus, Building2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface Organization {
  id: string;
  name: string;
  slug: string;
}

export function OrganizationSwitcher() {
  const { isMobile } = useSidebar();
  
  // Stub data - to be replaced with actual organization data
  const organizations: Organization[] = [
    { id: "1", name: "Personal", slug: "personal" },
    { id: "2", name: "Acme Corp", slug: "acme-corp" },
  ];
  
  const [activeOrgId, setActiveOrgId] = React.useState(organizations[0]?.id);
  const activeOrg = organizations.find(org => org.id === activeOrgId) || organizations[0];

  if (!activeOrg || organizations.length === 0) {
    return null;
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
                <Building2 className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{activeOrg.name}</span>
                <span className="truncate text-xs text-muted-foreground">Organization</span>
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
              Organizations
            </DropdownMenuLabel>
            {organizations.map((org, index) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => setActiveOrgId(org.id)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <Building2 className="size-3.5 shrink-0" />
                </div>
                {org.name}
                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2">
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium">Create organization</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
} 