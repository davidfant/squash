import { authClient } from "@/auth";
import { SignInForm } from "@/components/layout/auth/SignInForm";
import { Card, CardContent } from "@/components/ui/card";
import { Navigate } from "react-router";

export function LoginPage() {
  const session = authClient.useSession();

  // If already authenticated, redirect to landing page
  if (!session.isPending && session.data?.user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-svh grid place-items-center p-4 bg-muted">
      <Card className="w-full max-w-lg py-12">
        <CardContent className="space-y-8 px-12">
          <SignInForm showHeader />
        </CardContent>
      </Card>
    </div>
  );
}
