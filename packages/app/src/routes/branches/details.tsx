import { BranchLayout } from "@/components/layout/branch";
import { BranchLayoutSkeleton } from "@/components/layout/branch/skeleton";
import { BranchDeploymentLayout } from "@/components/layout/deployment/layout";
import { RedirectToSignIn, useAuth } from "@clerk/clerk-react";
import { useParams } from "react-router";
import { BranchContextProvider } from "../../components/layout/branch/context";

export function BranchPage() {
  const { branchId } = useParams();

  const auth = useAuth();
  if (!auth.isLoaded) return <BranchLayoutSkeleton />;
  if (!auth.isSignedIn) {
    return <RedirectToSignIn redirectUrl={window.location.href} />;
  }
  if (!auth.has({ role: "org:admin" })) {
    return <BranchDeploymentLayout branchId={branchId!} />;
  }
  return (
    <BranchContextProvider branchId={branchId!}>
      <BranchLayout branchId={branchId!} />
    </BranchContextProvider>
  );
}
