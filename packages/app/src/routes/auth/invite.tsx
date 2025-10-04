import { authClient } from "@/auth/client";
import { SignInForm } from "@/components/layout/auth/SignInForm";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { api, useMutation, useQuery } from "@/hooks/api";
import { AlertCircle, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router";

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
      <>
        <CardContent className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading invite...</p>
        </CardContent>
      </>
    );
  }

  if (invite.error || !invite.data || "error" in invite.data) {
    return (
      <>
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-red-600">Invite Error</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground mb-4">
            {invite.error?.message || "Failed to load invite"}
          </p>
          <Button onClick={() => navigate("/")} variant="outline">
            Go to Home
          </Button>
        </CardContent>
      </>
    );
  }

  return (
    <>
      <CardContent className="space-y-8 px-12">
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
      </CardContent>
    </>
  );
}

export const InvitePage = () => (
  <div className="min-h-svh grid place-items-center p-4 bg-muted">
    <Card className="w-full max-w-lg py-12">
      <InviteContent />
    </Card>
  </div>
);
