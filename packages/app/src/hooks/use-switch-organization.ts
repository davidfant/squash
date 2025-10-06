import { authClient } from "@/auth/client";
import { toast } from "@/components/ui/sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

export function useSwitchOrganization() {
  const orgs = authClient.useListOrganizations();
  const active = authClient.useActiveOrganization();
  const [isSwitching, setIsSwitching] = useState(false);
  const queryClient = useQueryClient();

  const switchOrganization = useCallback(
    async (organizationId: string) => {
      if (organizationId === active.data?.id) return;
      try {
        setIsSwitching(true);
        await authClient.organization.setActive({ organizationId });
        queryClient.cancelQueries();
        queryClient.invalidateQueries();
        await Promise.all([orgs.refetch(), active.refetch()]);
      } catch (error) {
        console.error("Failed to switch organization", error);
        toast.error("Unable to switch organization");
      } finally {
        setIsSwitching(false);
      }
    },
    [orgs, active]
  );

  return [isSwitching, switchOrganization] as const;
}
