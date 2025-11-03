import { SignIn, SignedIn, SignedOut } from "@clerk/clerk-react";
import { Navigate, useSearchParams } from "react-router";
import { AuthLayout } from "./components/layout";

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";

  return (
    <AuthLayout>
      <SignedIn>
        <Navigate to={redirect} replace />
      </SignedIn>
      <SignedOut>
        <SignIn
          redirectUrl={redirect}
          afterSignInUrl={redirect}
          afterSignUpUrl={redirect}
        />
      </SignedOut>
    </AuthLayout>
  );
}
