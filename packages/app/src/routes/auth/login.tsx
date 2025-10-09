import { authClient } from "@/auth/client";
import { SignInForm } from "@/components/layout/auth/SignInForm";
import { Navigate, useSearchParams } from "react-router";
import { AuthLayout } from "./components/layout";

export function LoginPage() {
  const session = authClient.useSession();
  const [searchParams] = useSearchParams();

  // If already authenticated, redirect to landing page
  if (!session.isPending && session.data?.user) {
    return <Navigate to="/" replace />;
  }

  return (
    <AuthLayout>
      <SignInForm
        showHeader
        callbackURL={searchParams.get("redirect") as string | undefined}
      />
    </AuthLayout>
  );
}
