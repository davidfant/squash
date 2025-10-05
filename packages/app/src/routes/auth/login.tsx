import { authClient } from "@/auth/client";
import { SignInForm } from "@/components/layout/auth/SignInForm";
import { Navigate } from "react-router";
import { AuthLayout } from "./components/layout";

export function LoginPage() {
  const session = authClient.useSession();

  // If already authenticated, redirect to landing page
  if (!session.isPending && session.data?.user) {
    return <Navigate to="/" replace />;
  }

  return (
    <AuthLayout>
      <SignInForm showHeader />
    </AuthLayout>
  );
}
