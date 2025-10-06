import { BranchLayout } from "@/components/layout/branch";
import { useParams } from "react-router";
import { BranchContextProvider } from "../../components/layout/branch/context";

export function BranchPage() {
  const { branchId } = useParams();
  return (
    <BranchContextProvider branchId={branchId!}>
      <BranchLayout branchId={branchId!} />
    </BranchContextProvider>
  );
}
