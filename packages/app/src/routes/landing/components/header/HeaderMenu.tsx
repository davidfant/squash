import { authClient } from "@/auth/client";
import { RequireRole } from "@/auth/RequireRole";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/sonner";
import { useTheme } from "@/contexts/ThemeContext";
import { InviteButton } from "@/routes/branches/header/InviteButton";
import { CreateOrganizationMenuItem } from "@/routes/landing/components/header/CreateOrganizationMenuItem";
import { useQueryClient } from "@tanstack/react-query";
import { Check, LogOut, Moon, Sun } from "lucide-react";
import { useState } from "react";

export function HeaderMenu() {
  const orgs = authClient.useListOrganizations();
  const activeOrg = authClient.useActiveOrganization();
  const session = authClient.useSession();
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();

  const [isSwitching, setIsSwitching] = useState(false);

  const organizations = orgs.data ?? [];
  const active = activeOrg.data;

  const handleSelect = async (organizationId: string) => {
    if (organizationId === active?.id) return;
    try {
      setIsSwitching(true);
      await authClient.organization.setActive({ organizationId });
      queryClient.cancelQueries();
      queryClient.invalidateQueries();
      await Promise.all([orgs.refetch(), activeOrg.refetch()]);
    } catch (error) {
      console.error("Failed to switch organization", error);
      toast.error("Unable to switch organization");
    } finally {
      setIsSwitching(false);
    }
  };

  if (!session.data?.user) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" disabled={isSwitching} className="gap-2 px-2">
          <Avatar
            image={active?.logo ?? ""}
            name={active?.name ?? ""}
            className="size-6"
          />
          <span>{active?.name ?? ""}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {/* Active org and user info header */}
        <DropdownMenuLabel className="flex flex-col gap-2 p-3">
          <div className="flex items-center gap-3">
            <Avatar
              image={active?.logo ?? ""}
              name={active?.name ?? ""}
              className="size-8"
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold">
                {active?.name ?? ""}
              </span>
              <span className="text-xs text-muted-foreground">
                {session.data.user.email}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>

        <RequireRole roles={["admin", "owner"]}>
          <InviteButton />
        </RequireRole>

        <DropdownMenuSeparator />

        {/* Organizations group */}
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => handleSelect(org.id)}
            className="flex items-center gap-3"
          >
            <Avatar image={org.logo ?? ""} name={org.name} className="size-6" />
            <span className="flex-1 text-sm">{org.name}</span>
            {active?.id === org.id && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}
        <CreateOrganizationMenuItem
          onSuccess={async (organizationId) => {
            await orgs.refetch();
            await handleSelect(organizationId);
          }}
        />

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={toggleTheme} className="gap-2">
          {theme === "dark" ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
          <span>Switch to {theme === "dark" ? "light" : "dark"} theme</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => authClient.signOut()}
          className="gap-2"
        >
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
