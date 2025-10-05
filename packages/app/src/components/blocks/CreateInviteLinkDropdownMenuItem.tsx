import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/sonner";
import { api, useMutation } from "@/hooks/api";
import { Check, Link2, Loader2 } from "lucide-react";
import { useState } from "react";

export function CreateInviteLinkDropdownMenuItem() {
  const [inviteLinkStatus, setInviteLinkStatus] = useState<
    "idle" | "loading" | "success"
  >("idle");

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
  );
}
