import { authClient } from "@/auth";
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
import { Check, Link2, Loader2, UserPlus } from "lucide-react";
import { useState } from "react";

export const InviteButton = () => {
  const [inviteLinkStatus, setInviteLinkStatus] = useState<
    "idle" | "loading" | "success"
  >("idle");

  const members = authClient.useActiveOrganization().data?.members;

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
      json: { role: "member", path: window.location.pathname },
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
        <h3 className="p-2 font-medium">Invite your team</h3>

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
        {!members?.length && <Skeleton className="h-12" />}
        {members?.map((member) => (
          <DropdownMenuItem key={member.id}>
            <Avatar
              name={member.user.name}
              image={member.user.image}
              className="size-6 flex-shrink-0"
            />
            <div>
              <p>{member.user.name}</p>
              <p className="text-xs text-muted-foreground">
                {member.user.email}
              </p>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
