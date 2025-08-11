import { authClient } from "@/auth";
import { api, useQuery } from "@/hooks/api";
import { Loader2 } from "lucide-react";
import { Navigate } from "react-router";

export function LandingPage() {
  const session = authClient.useSession();
  const repos = useQuery(api.repos.$get, { params: {} });

  if (!session.isPending && !session.data?.user) {
    return <Navigate to="/login" replace />;
  }

  if (!!repos.data?.length) {
    return <Navigate to={`/repos/${repos.data[0]!.id}`} replace />;
  }

  if (repos.data && repos.data.length === 0) {
    return <Navigate to="/new/repo" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="size-8 animate-spin opacity-30" />
    </div>
  );
}
