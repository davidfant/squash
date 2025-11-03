import { ClerkLoaded, SignedIn, SignedOut } from "@clerk/clerk-react";
import { Navigate, Outlet } from "react-router";

export function RequireAuthGuard() {
  return (
    <ClerkLoaded>
      <SignedIn>
        <Outlet />
      </SignedIn>
      <SignedOut>
        <Navigate to="/login" replace />
      </SignedOut>
    </ClerkLoaded>
  );
}
