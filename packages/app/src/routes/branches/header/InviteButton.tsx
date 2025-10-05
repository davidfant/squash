import { authClient } from "@/auth/client";
import { CreateInviteLinkDropdownMenuItem } from "@/components/blocks/CreateInviteLinkDropdownMenuItem";
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
import { Skeleton } from "@/components/ui/skeleton";
import type { MemberRole } from "@squashai/api";
import { UserPlus } from "lucide-react";

function useUsersWithRole(...roles: MemberRole[]) {
  const activeOrg = authClient.useActiveOrganization().data;
  return activeOrg?.members.filter((m) => roles.includes(m.role as MemberRole));
}

const MemberDropdownMenuItem = ({
  name,
  image,
}: {
  name: string;
  image: string | undefined;
}) => (
  <DropdownMenuItem>
    <Avatar name={name} image={image} className="size-6 flex-shrink-0" />
    <div>
      <p>{name}</p>
      {/* <p className="text-xs text-muted-foreground">
                    {member.user.email}
                  </p> */}
    </div>
  </DropdownMenuItem>
);

export const InviteButton = () => {
  const editors = useUsersWithRole("admin", "owner", "editor");
  const viewers = useUsersWithRole("viewer");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus />
          Invite
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <h3 className="px-2 font-medium">Invite your team</h3>

        <CreateInviteLinkDropdownMenuItem />
        <DropdownMenuSeparator />

        <DropdownMenuLabel className="pb-0">Edit access</DropdownMenuLabel>
        {!editors?.length && <Skeleton className="h-12" />}
        {editors?.map((member) => (
          <MemberDropdownMenuItem
            key={member.id}
            name={member.user.name}
            image={member.user.image}
          />
        ))}

        {!!viewers?.length && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="pb-0">View access</DropdownMenuLabel>
            {viewers?.map((member) => (
              <MemberDropdownMenuItem
                key={member.id}
                name={member.user.name}
                image={member.user.image}
              />
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
