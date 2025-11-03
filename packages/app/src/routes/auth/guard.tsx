import {
  ClerkLoaded,
  RedirectToSignIn,
  SignedIn,
  SignedOut,
} from "@clerk/clerk-react";
import { Outlet } from "react-router";

export function RequireAuthGuard() {
  return (
    <ClerkLoaded>
      <SignedIn>
        <Outlet />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn redirectUrl={window.location.href} />
      </SignedOut>
    </ClerkLoaded>
  );
}
