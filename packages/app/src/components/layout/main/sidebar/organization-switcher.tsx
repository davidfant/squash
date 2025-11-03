import { ChevronsUpDown } from "lucide-react";

import { authClient } from "@/auth/client";
import { CreateInviteLinkDropdownMenuItem } from "@/components/blocks/CreateInviteLinkDropdownMenuItem";
import { CreateOrganizationMenuItem } from "@/components/layout/main/sidebar/create-organization-menu-item";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useSwitchOrganization } from "@/hooks/use-switch-organization";

export function OrganizationSwitcher() {
  const orgs = authClient.useListOrganizations();
  const active = authClient.useActiveOrganization();
  const [isSwitching, switchOrganization] = useSwitchOrganization();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar
                image={active.data?.logo ?? ""}
                name={active.data?.name ?? ""}
                className="size-8 rounded-lg"
              />

              <div className="grid flex-1 text-left text-sm leading-tight truncate font-medium">
                {active.data?.name}
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" sideOffset={4}>
            <CreateInviteLinkDropdownMenuItem />

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Organizations
            </DropdownMenuLabel>
            {orgs.data?.map((org, index) => (
              <DropdownMenuItem
                key={org.id}
                disabled={isSwitching}
                onClick={() => switchOrganization(org.id)}
                className="gap-2 p-2"
              >
                <Avatar
                  image={org.logo ?? ""}
                  name={org.name}
                  className="size-6 rounded-md"
                />
                {org.name}
              </DropdownMenuItem>
            ))}
            {/* <DropdownMenuSeparator /> */}
            <CreateOrganizationMenuItem
              onSuccess={async (organizationId) => {
                await orgs.refetch();
                await switchOrganization(organizationId);
              }}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
