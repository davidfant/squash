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
import {
  Protect,
  useClerk,
  useOrganization,
  useOrganizationList,
} from "@clerk/clerk-react";
import { Check, ChevronsUpDown, Plus, Settings, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";

export function OrganizationSwitcher() {
  const { t } = useTranslation("auth");
  const clerk = useClerk();
  const orgs = useOrganizationList({ userMemberships: true });
  const { organization } = useOrganization();

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
                image={organization?.imageUrl}
                name={organization?.name ?? ""}
                className="size-8 rounded-lg"
              />

              <div className="grid flex-1 text-left text-sm leading-tight truncate font-medium">
                {organization?.name}
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={4}>
            <Protect permission="sys_profile:manage">
              <DropdownMenuItem onClick={() => clerk.openOrganizationProfile()}>
                <Settings />
                Manage
              </DropdownMenuItem>
            </Protect>
            <Protect permission="sys_memberships:manage">
              <DropdownMenuItem
                onClick={() =>
                  clerk.openOrganizationProfile({
                    __experimental_startPath: "/organization-members",
                  })
                }
              >
                <UserPlus />
                Invite
              </DropdownMenuItem>
            </Protect>

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Organizations
            </DropdownMenuLabel>
            {orgs.userMemberships.data?.map((m) => (
              <DropdownMenuItem
                key={m.id}
                onClick={() =>
                  orgs.isLoaded &&
                  orgs.setActive({ organization: m.organization })
                }
                className="gap-2 p-2"
              >
                <Avatar
                  image={m.organization.imageUrl}
                  name={m.organization.name}
                  className="size-6 rounded-md"
                />
                <span className="flex-1">{m.organization.name}</span>
                {m.organization.id === organization?.id && <Check />}
              </DropdownMenuItem>
            ))}
            {/* <DropdownMenuSeparator /> */}
            <DropdownMenuItem
              onClick={() => clerk.openCreateOrganization()}
              className="cursor-pointer"
            >
              <Plus className="size-4 mx-1" />
              {t("avatar.createOrganization.title")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
