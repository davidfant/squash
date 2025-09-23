import { authClient } from "@/auth";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { Check, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CreateOrganizationMenuItem } from "./CreateOrganizationMenuItem";
// import { InviteUserMenuItem } from "./InviteUserMenuItem";

export function CurrentUserAvatar({
  fallback,
}: {
  fallback?: React.ReactNode;
}) {
  const session = authClient.useSession();
  const orgs = authClient.useListOrganizations();
  const org = authClient.useActiveOrganization();
  const { t } = useTranslation("auth");
  const queryClient = useQueryClient();

  const setActiveOrganization = async (organizationId: string) => {
    try {
      await authClient.organization.setActive({ organizationId });
      queryClient.cancelQueries();
      queryClient.invalidateQueries();
    } catch (error) {
      console.error("Failed to set active organization:", error);
    }
  };

  if (session.isPending) {
    return <div className="size-8" />;
    // return <Skeleton className="w-32 h-8 bg-gray-500/20" />;
  }

  if (session.data?.user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="focus:outline-none">
            <Avatar
              name={org.data?.name ?? session.data.user.name ?? ""}
              image={org.data?.logo ?? session.data.user.image ?? undefined}
              className="cursor-pointer size-8"
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* <div className="flex items-center justify-start gap-2 p-2">
            <div className="flex flex-col space-y-1 leading-none">
              {session.data.user.name && (
                <p className="font-medium">{session.data.user.name}</p>
              )}
              {session.data.user.email && (
                <p className="truncate text-sm text-muted-foreground">
                  {session.data.user.email}
                </p>
              )}
            </div>
          </div> */}

          {!!org?.data && (
            <>
              <div className="flex items-center gap-2 p-2">
                <Avatar
                  name={org.data.name}
                  image={org.data.logo ?? undefined}
                  className="size-6"
                />
                <p className="truncate min-w-0 font-medium text-sm">
                  {org.data.name}
                </p>
              </div>
              {/* <InviteUserMenuItem /> */}
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuLabel>
            {t("avatar.organizations", { ns: "auth" })}
          </DropdownMenuLabel>
          {orgs.data?.map((o) => (
            <DropdownMenuItem
              key={o.id}
              onClick={() => setActiveOrganization(o.id)}
              className="flex items-center justify-between cursor-pointer"
            >
              <span className="truncate">{o.name}</span>
              {org.data?.id === o.id && <Check className="size-4" />}
            </DropdownMenuItem>
          ))}
          <CreateOrganizationMenuItem
            onSuccess={async (organizationId) => {
              orgs.refetch();
              await setActiveOrganization(organizationId);
            }}
          />

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => authClient.signOut()}>
            <LogOut className="size-4" />
            {t("signOut", { ns: "common" })}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return fallback ?? null;
}
