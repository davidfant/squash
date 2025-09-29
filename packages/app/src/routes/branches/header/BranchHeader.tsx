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
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import { api, useMutation } from "@/hooks/api";
import { Check, Link2, Loader2, UserPlus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

export const BranchHeader = ({ title }: { title: string }) => {
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
    // Don't close the dropdown anymore - keep it open to show the status
  };

  return (
    <header className="flex items-center justify-between p-2">
      <div className="flex items-center gap-2">
        <Link to="/" className="flex items-center">
          <img
            src="/preview/gradients/0.jpg"
            alt="Squash"
            className="size-6 hover:opacity-80 transition-opacity rounded-full"
          />
        </Link>
        <span className="font-medium text-sm">{title}</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Invite Button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <UserPlus />
              Invite
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="p-2">
              <Label>Invite your team</Label>
            </div>

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

            {/* <div className="p-3">
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Input
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="Enter email address"
                      className="text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleEmailInvite();
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={handleEmailInvite}
                      disabled={createInvite.isPending || !inviteEmail.trim()}
                    >
                      <Mail className="size-3" />
                      Send
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Send an invitation via email
                  </p>
                </div>
              </div>
            </div>
            <DropdownMenuSeparator /> */}

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

        {/* Share Button */}
        {/* <DropdownMenu
          open={shareDropdownOpen}
          onOpenChange={setShareDropdownOpen}
        >
          <DropdownMenuTrigger asChild>
            <Button variant="default" size="sm">
              <Share className="size-4" />
              Share
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="p-3">
              <div className="text-sm font-medium mb-2">Share this branch</div>
              <div className="flex items-center gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="text-xs"
                  placeholder="Branch URL"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(shareUrl)}
                >
                  <Copy className="size-3" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Anyone with this link can view this branch
              </p>
            </div>
          </DropdownMenuContent>
        </DropdownMenu> */}
      </div>
    </header>
  );
};
