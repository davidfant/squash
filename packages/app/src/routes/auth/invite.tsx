import { authClient } from "@/auth/client";
import { SignInForm } from "@/components/layout/auth/SignInForm";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { api, useMutation, useQuery } from "@/hooks/api";
import { AlertCircle, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { AuthLayout } from "./components/layout";

function InviteContent() {
  const { inviteId } = useParams<{ inviteId: string }>();
  const navigate = useNavigate();

  const session = authClient.useSession();
  const user = session.data?.user;

  const invite = useQuery(api.invites[":id"].$get, {
    params: { id: inviteId! },
    enabled: !!inviteId,
  });

  const acceptInvite = useMutation(api.invites[":id"].accept.$post, {
    onSuccess: async (data) => {
      toast.success(data.message);
      await authClient.updateUser();
      navigate(invite.data?.path ?? "/");
    },
  });

  if (invite.isLoading || session.isPending) {
    return (
      <p className="text-muted-foreground flex items-center justify-center gap-2">
        <Loader2 className="size-4 animate-spin" />
        Loading invite...
      </p>
    );
  }

  if (invite.error || !invite.data || "error" in invite.data) {
    return (
      <>
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>
            {invite.error?.message || "Failed to load invite"}
          </AlertTitle>
        </Alert>
        <Button onClick={() => navigate("/")} variant="link" className="w-full">
          Go to Home
        </Button>
      </>
    );
  }

  return (
    <div className="space-y-8">
      <Avatar
        className="size-16 mx-auto"
        name={invite.data.inviter.name}
        image={invite.data.inviter.image ?? undefined}
      />
      <div>
        <CardTitle className="text-xl text-center">You're Invited!</CardTitle>
        <p className="text-muted-foreground text-center">
          {invite.data.inviter.name} has invited you to join{" "}
          {invite.data.organization.name}
        </p>
      </div>
      {user ? (
        <Button
          onClick={() => acceptInvite.mutate({ param: { id: inviteId! } })}
          disabled={acceptInvite.isPending}
          className="w-full"
          size="lg"
        >
          {acceptInvite.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Accepting...
            </>
          ) : (
            "Accept Invite"
          )}
        </Button>
      ) : (
        <SignInForm callbackURL={window.location.href} />
      )}
    </div>
  );
}

export const InvitePage = () => (
  <AuthLayout>
    <InviteContent />
  </AuthLayout>
);
