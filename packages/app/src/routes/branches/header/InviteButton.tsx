import { authClient } from "@/auth/client";
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
import { toast } from "@/components/ui/sonner";
import { api, useMutation } from "@/hooks/api";
import type { MemberRole } from "@squashai/api";
import { Check, Link2, Loader2, UserPlus } from "lucide-react";
import { useState } from "react";

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
  const [inviteLinkStatus, setInviteLinkStatus] = useState<
    "idle" | "loading" | "success"
  >("idle");

  const editors = useUsersWithRole("admin", "owner", "editor");
  const viewers = useUsersWithRole("viewer");

  // Create invite mutation
  const createInvite = useMutation(api.invites.create.$post, {
    onSuccess: async (data) => {
      try {
        await navigator.clipboard.writeText(data.inviteUrl);
        setInviteLinkStatus("success");
        // Reset status after 3 seconds
        setTimeout(() => setInviteLinkStatus("idle"), 3000);
      } catch (err) {
        toast.error("Failed to copy to clipboard");
        setInviteLinkStatus("idle");
      }
    },
    onError: () => {
      toast.error("Failed to create invite link");
      setInviteLinkStatus("idle");
    },
  });

  const handleCreateInviteLink = (ev: React.MouseEvent<HTMLDivElement>) => {
    ev.preventDefault();

    setInviteLinkStatus("loading");
    createInvite.mutate({
      json: { role: "editor", path: window.location.pathname },
    });
  };

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

        <DropdownMenuItem
          onClick={handleCreateInviteLink}
          disabled={
            inviteLinkStatus === "loading" || inviteLinkStatus === "success"
          }
        >
          {inviteLinkStatus === "loading" ? (
            <Loader2 className="animate-spin" />
          ) : inviteLinkStatus === "success" ? (
            <Check />
          ) : (
            <Link2 />
          )}
          {inviteLinkStatus === "success"
            ? "Invite link copied to clipboard"
            : "Create invite link"}
        </DropdownMenuItem>
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
