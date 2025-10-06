import { authClient } from "@/auth/client"; // adjust the import if needed
import { Navigate, Outlet } from "react-router";

export function RequireAuthGuard() {
  const session = authClient.useSession();

  if (session.isPending) return null;
  if (!session.data?.user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
